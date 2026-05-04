<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\OrderStatusUpdatedMail;
use App\Models\Order;
use App\Models\PaymentProof;
use App\Services\NotificationService;
use App\Services\Payments\OrderPaymentSynchronizer;
use App\Support\SendsAppMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class AdminOrderController extends Controller
{
    use SendsAppMail;

    private const STATUS_ALIASES = [
        'pending' => Order::STATUS_PENDING,
        'paid' => Order::STATUS_PAID,
        'diproses' => Order::STATUS_PROCESSED,
        'processed' => Order::STATUS_PROCESSED,
        'dikirim' => Order::STATUS_SHIPPED,
        'shipped' => Order::STATUS_SHIPPED,
        'selesai' => Order::STATUS_COMPLETED,
        'completed' => Order::STATUS_COMPLETED,
        'cancelled' => Order::STATUS_CANCELLED,
        'dibatalkan' => Order::STATUS_CANCELLED,
    ];

    public function __construct(
        private OrderPaymentSynchronizer $paymentSynchronizer,
        private NotificationService $notifications,
    )
    {
    }

    public function index(): JsonResponse
    {
        $orders = Order::query()
            ->with(['user', 'items.product', 'paymentProof'])
            ->latest()
            ->get();

        return response()->json([
            'data' => $orders,
            'meta' => [
                'summary' => [
                    'total_orders' => $orders->count(),
                    'waiting_payment' => $orders->where('status', Order::STATUS_PENDING)->count(),
                    'paid_orders' => $orders->where('status', Order::STATUS_PAID)->count(),
                    'in_delivery' => $orders->where('status', Order::STATUS_SHIPPED)->count(),
                ],
            ],
        ]);
    }

    public function update(Request $request, Order $order): JsonResponse
    {
        if ($order->expirePendingPaymentIfNeeded()) {
            return response()->json([
                'message' => 'Batas pembayaran 24 jam sudah lewat. Pesanan sudah dibatalkan otomatis.',
                'data' => $order->fresh(['user', 'items.product', 'paymentProof']),
            ], 422);
        }

        $validated = $request->validate([
            'status' => ['nullable', 'string'],
            'tracking_number' => ['nullable', 'string', 'max:255'],
        ]);

        if (! array_key_exists('status', $validated) && ! array_key_exists('tracking_number', $validated)) {
            return response()->json([
                'message' => 'Tidak ada data pembaruan yang dikirim.',
            ], 422);
        }

        $previousStatus = $order->status;
        $nextStatus = isset($validated['status'])
            ? $this->normalizeStatus($validated['status'])
            : null;

        if ($nextStatus === Order::STATUS_COMPLETED) {
            return response()->json([
                'message' => 'Admin tidak bisa menyelesaikan pesanan. Konfirmasi selesai hanya dapat dilakukan oleh customer.',
            ], 422);
        }

        if ($nextStatus === Order::STATUS_PAID) {
            if (! $this->isManualPaymentMethod($order->payment_method)) {
                return response()->json([
                    'message' => 'Status paid hanya bisa diverifikasi manual untuk pembayaran QRIS atau transfer BCA.',
                ], 422);
            }

            $paymentProof = $this->latestPaymentProof($order);

            if ($paymentProof?->verification_status === PaymentProof::STATUS_PENDING) {
                return response()->json([
                    'message' => 'Gunakan tombol Verifikasi Bukti untuk memverifikasi pembayaran yang sudah diupload customer.',
                ], 422);
            }

            if ($paymentProof?->verification_status === PaymentProof::STATUS_REJECTED) {
                return response()->json([
                    'message' => 'Bukti pembayaran terakhir sudah ditolak. Tunggu customer mengirim bukti baru sebelum verifikasi.',
                ], 422);
            }

            return response()->json([
                'message' => 'Customer harus upload bukti pembayaran terlebih dahulu.',
            ], 422);
        }

        if ($nextStatus && ! $order->canTransitionTo($nextStatus)) {
            return response()->json([
                'message' => 'Status pesanan tidak valid untuk transisi saat ini.',
            ], 422);
        }

        if (($nextStatus ?? $order->status) === Order::STATUS_SHIPPED
            && blank($validated['tracking_number'] ?? $order->tracking_number)) {
            return response()->json([
                'message' => 'Nomor resi wajib diisi saat status pesanan dikirim.',
            ], 422);
        }

        $order->fill([
            'status' => $nextStatus ?? $order->status,
            'tracking_number' => $validated['tracking_number'] ?? $order->tracking_number,
            'status_updated_at' => $nextStatus && $nextStatus !== $order->status
                ? now()
                : $order->status_updated_at,
        ]);

        $order->save();

        $freshOrder = $order->fresh(['user', 'items.product', 'paymentProof']);

        if ($previousStatus !== $freshOrder->status) {
            $this->sendMailSilently(
                $freshOrder->customer_email,
                new OrderStatusUpdatedMail($freshOrder, $previousStatus),
            );
            $this->notifications->orderStatusUpdated($freshOrder, $previousStatus);
        }

        return response()->json([
            'message' => 'Pesanan admin berhasil diperbarui.',
            'data' => $freshOrder,
        ]);
    }

    public function verifyPaymentProof(Request $request, Order $order): JsonResponse
    {
        if ($order->expirePendingPaymentIfNeeded()) {
            return response()->json([
                'message' => 'Batas pembayaran 24 jam sudah lewat. Pesanan sudah dibatalkan otomatis.',
                'data' => $order->fresh(['user', 'items.product', 'paymentProof']),
            ], 422);
        }

        $paymentProof = $this->pendingPaymentProof($order);

        if (! $paymentProof) {
            return response()->json([
                'message' => 'Tidak ada bukti pembayaran pending untuk pesanan ini.',
            ], 422);
        }

        if (! $this->isManualPaymentMethod($order->payment_method)) {
            return response()->json([
                'message' => 'Verifikasi bukti pembayaran hanya tersedia untuk QRIS atau transfer BCA.',
            ], 422);
        }

        $previousStatus = $order->status;

        try {
            $syncResult = $this->paymentSynchronizer->sync($order, [
                'transaction_status' => Order::PAYMENT_STATUS_PAID,
                'transaction_id' => $order->payment_reference ?? $this->manualPaymentReferencePrefix($order) . '-' . $order->code,
                'status_message' => 'Bukti pembayaran diverifikasi admin.',
            ]);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        $paymentProof->update([
            'verification_status' => PaymentProof::STATUS_VERIFIED,
            'verified_at' => now(),
            'verified_by' => $request->user()->id,
            'rejection_note' => null,
        ]);

        $freshOrder = $syncResult['order']->fresh(['user', 'items.product', 'paymentProof']);

        if ($previousStatus !== $freshOrder->status) {
            $this->sendMailSilently(
                $freshOrder->customer_email,
                new OrderStatusUpdatedMail($freshOrder, $previousStatus),
            );
        }

        $this->notifications->paymentProofVerified($freshOrder);

        return response()->json([
            'message' => 'Bukti pembayaran berhasil diverifikasi.',
            'data' => $freshOrder,
        ]);
    }

    public function rejectPaymentProof(Request $request, Order $order): JsonResponse
    {
        $paymentProof = $this->pendingPaymentProof($order);

        if (! $paymentProof) {
            return response()->json([
                'message' => 'Tidak ada bukti pembayaran pending untuk pesanan ini.',
            ], 422);
        }

        if ($order->status !== Order::STATUS_PENDING || $order->payment_status === Order::PAYMENT_STATUS_PAID) {
            return response()->json([
                'message' => 'Bukti pembayaran tidak bisa ditolak karena pesanan sudah terverifikasi atau diproses.',
            ], 422);
        }

        $validated = $request->validate([
            'rejection_note' => ['nullable', 'string', 'max:500'],
        ]);

        $paymentProof->update([
            'verification_status' => PaymentProof::STATUS_REJECTED,
            'verified_at' => now(),
            'verified_by' => $request->user()->id,
            'rejection_note' => $validated['rejection_note'] ?? null,
        ]);

        $order->update([
            'status' => Order::STATUS_PENDING,
            'payment_status' => Order::PAYMENT_STATUS_PENDING,
            'status_updated_at' => now(),
        ]);

        $freshOrder = $order->fresh(['user', 'items.product', 'paymentProof']);
        $this->notifications->paymentProofRejected($freshOrder);

        return response()->json([
            'message' => 'Bukti pembayaran ditolak. Pesanan kembali pending.',
            'data' => $freshOrder,
        ]);
    }

    private function normalizeStatus(string $status): string
    {
        $normalizedStatus = self::STATUS_ALIASES[strtolower(trim($status))] ?? null;

        if (! $normalizedStatus) {
            abort(422, 'Status pesanan tidak dikenali.');
        }

        return $normalizedStatus;
    }

    private function pendingPaymentProof(Order $order): ?PaymentProof
    {
        return $order->paymentProofs()
            ->where('verification_status', PaymentProof::STATUS_PENDING)
            ->latest()
            ->first();
    }

    private function latestPaymentProof(Order $order): ?PaymentProof
    {
        return $order->paymentProofs()
            ->latest()
            ->first();
    }

    private function isManualPaymentMethod(?string $paymentMethod): bool
    {
        return in_array($paymentMethod, ['qris_manual', 'bank_transfer_bca'], true);
    }

    private function manualPaymentReferencePrefix(Order $order): string
    {
        return $order->payment_method === 'bank_transfer_bca' ? 'BCA' : 'QRIS';
    }
}
