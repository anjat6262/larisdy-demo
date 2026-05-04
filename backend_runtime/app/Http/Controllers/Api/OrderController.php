<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\OrderStatusUpdatedMail;
use App\Models\Order;
use App\Models\PaymentProof;
use App\Models\Testimonial;
use App\Services\NotificationService;
use App\Support\SendsAppMail;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    use SendsAppMail;

    public function __construct(private NotificationService $notifications)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $orders = Order::query()
            ->with(['user', 'items.product', 'paymentProof'])
            ->when(! $user->isAdmin(), function ($query) use ($user): void {
                $query->where('user_id', $user->id);
            })
            ->latest()
            ->get();

        return response()->json([
            'data' => $orders->map(fn (Order $order): array => $this->orderResponsePayload($order)),
        ]);
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        $this->authorizeOrderAccess($request, $order);

        return response()->json([
            'data' => $this->orderResponsePayload($order),
        ]);
    }

    public function storePaymentProof(Request $request, Order $order): JsonResponse
    {
        $this->authorizeOrderAccess($request, $order);

        if ($order->payment_status === Order::PAYMENT_STATUS_EXPIRED) {
            return response()->json([
                'message' => 'Batas pembayaran 24 jam sudah lewat. Pesanan dibatalkan otomatis.',
                'data' => $this->orderResponsePayload($order->fresh(['user', 'items.product', 'paymentProof'])),
            ], 422);
        }

        if ($order->expirePendingPaymentIfNeeded()) {
            return response()->json([
                'message' => 'Batas pembayaran 24 jam sudah lewat. Pesanan dibatalkan otomatis.',
                'data' => $this->orderResponsePayload($order->fresh(['user', 'items.product', 'paymentProof'])),
            ], 422);
        }

        if ((int) $order->user_id !== (int) $request->user()->id) {
            return response()->json([
                'message' => 'Akses ditolak untuk pesanan ini.',
            ], 403);
        }

        if ($order->status !== Order::STATUS_PENDING || $order->payment_status === Order::PAYMENT_STATUS_PAID) {
            return response()->json([
                'message' => 'Bukti pembayaran hanya bisa dikirim untuk pesanan yang masih pending.',
            ], 422);
        }

        $existingPendingProof = $order->paymentProofs()
            ->where('verification_status', PaymentProof::STATUS_PENDING)
            ->exists();

        if ($existingPendingProof) {
            return response()->json([
                'message' => 'Bukti pembayaran sudah terkirim dan sedang menunggu verifikasi admin.',
            ], 422);
        }

        $validated = $request->validate([
            'proof' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $filePath = $request->file('proof')->store('payment-proofs', 'public');

        $order->paymentProofs()->create([
            'user_id' => $request->user()->id,
            'file_path' => $filePath,
            'note' => $validated['note'] ?? null,
            'uploaded_at' => now(),
            'verification_status' => PaymentProof::STATUS_PENDING,
        ]);

        $freshOrder = $order->fresh(['user', 'items.product', 'paymentProof']);
        $this->notifications->paymentProofUploaded($freshOrder);

        return response()->json([
            'message' => 'Bukti pembayaran berhasil dikirim. Admin akan melakukan verifikasi.',
            'data' => $this->orderResponsePayload($freshOrder),
        ], 201);
    }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Akses ditolak untuk role Anda.',
            ], 403);
        }

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(Order::STATUSES)],
        ]);

        if (! $order->canTransitionTo($validated['status'])) {
            $expectedStatus = implode(', ', $order->allowedTransitions());

            return response()->json([
                'message' => $expectedStatus !== ''
                    ? "Status {$order->status} hanya bisa diubah ke {$expectedStatus}."
                    : 'Pesanan ini tidak memiliki status lanjutan yang bisa diproses.',
            ], 422);
        }

        if ($validated['status'] === Order::STATUS_PAID) {
            return response()->json([
                'message' => 'Gunakan dashboard pesanan admin untuk verifikasi pembayaran manual.',
            ], 422);
        }

        if ($validated['status'] === Order::STATUS_COMPLETED) {
            return response()->json([
                'message' => 'Admin tidak bisa menyelesaikan pesanan. Konfirmasi selesai hanya dapat dilakukan oleh customer.',
            ], 422);
        }

        $order->update([
            'status' => $validated['status'],
            'status_updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Status pesanan berhasil diperbarui.',
            'data' => $this->orderResponsePayload($order->fresh(['user', 'items.product', 'paymentProof'])),
        ]);
    }

    public function complete(Request $request, Order $order): JsonResponse
    {
        $this->authorizeOrderAccess($request, $order);

        if ((int) $order->user_id !== (int) $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak untuk pesanan ini.',
            ], 403);
        }

        if ($order->status !== Order::STATUS_SHIPPED) {
            return response()->json([
                'success' => false,
                'message' => 'Pesanan hanya bisa diselesaikan setelah status dikirim.',
            ], 422);
        }

        $previousStatus = $order->status;

        $order->update([
            'status' => Order::STATUS_COMPLETED,
            'status_updated_at' => now(),
        ]);

        $freshOrder = $order->fresh(['user', 'items.product', 'paymentProof']);

        $this->sendMailSilently(
            $freshOrder->customer_email,
            new OrderStatusUpdatedMail($freshOrder, $previousStatus),
        );
        $this->notifications->orderStatusUpdated($freshOrder, $previousStatus);

        return response()->json([
            'success' => true,
            'message' => 'Pesanan telah diselesaikan',
            'data' => $this->orderResponsePayload($freshOrder),
        ]);
    }

    private function orderResponsePayload(Order $order): array
    {
        $order->loadMissing(['user', 'items.product', 'paymentProof']);
        $order->expirePendingPaymentIfNeeded();
        $order->refresh()->loadMissing(['user', 'items.product', 'paymentProof']);
        $reviewableItems = $this->reviewableItems($order);

        return array_merge($order->toArray(), [
            'payment_deadline_passed' => $order->payment_status === Order::PAYMENT_STATUS_EXPIRED,
            'payment_deadline_seconds_remaining' => $this->paymentDeadlineSecondsRemaining($order),
            'reviewable_items' => $reviewableItems,
            'reviewable_items_count' => count($reviewableItems),
            'tracking_timeline' => $this->trackingTimeline($order),
        ]);
    }

    private function paymentDeadlineSecondsRemaining(Order $order): ?int
    {
        if (! $order->payment_expires_at || $order->status !== Order::STATUS_PENDING) {
            return null;
        }

        return (int) max(0, now()->diffInSeconds($order->payment_expires_at, false));
    }

    private function reviewableItems(Order $order): array
    {
        if ($order->status !== Order::STATUS_COMPLETED) {
            return [];
        }

        $reviewedProductIds = Testimonial::query()
            ->where('user_id', $order->user_id)
            ->where('order_id', $order->id)
            ->pluck('product_id')
            ->map(fn ($productId): int => (int) $productId)
            ->all();

        return $order->items
            ->filter(fn ($item): bool => ! in_array((int) $item->product_id, $reviewedProductIds, true))
            ->map(fn ($item): array => [
                'order_item_id' => $item->id,
                'product_id' => (int) $item->product_id,
                'product' => $item->product?->toArray(),
            ])
            ->values()
            ->all();
    }

    private function authorizeOrderAccess(Request $request, Order $order): void
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            return;
        }

        if ((int) $order->user_id !== (int) $user->id) {
            throw new HttpResponseException(response()->json([
                'message' => 'Akses ditolak untuk pesanan ini.',
            ], 403));
        }
    }

    private function trackingTimeline(Order $order): array
    {
        if ($order->status === Order::STATUS_CANCELLED) {
            return [
                $this->trackingStep('pending', 'Pesanan Dibuat', 'Pesanan sudah tercatat di sistem Larisdy.', true),
                $this->trackingStep('cancelled', 'Pesanan Dibatalkan', 'Pesanan dibatalkan dan tidak akan diproses lebih lanjut.', true, true),
            ];
        }

        $statusOrder = [
            Order::STATUS_PENDING => 0,
            Order::STATUS_PAID => 1,
            Order::STATUS_PROCESSED => 2,
            Order::STATUS_SHIPPED => 3,
            Order::STATUS_COMPLETED => 4,
        ];
        $currentPosition = $statusOrder[$order->status] ?? 0;
        $shippingCourierLabel = $this->shippingCourierLabel($order->shipping_courier);

        return [
            $this->trackingStep(
                'pending',
                'Pesanan Dibuat',
                'Pesanan diterima dan menunggu pembayaran.',
                $currentPosition >= 0,
                $order->status === Order::STATUS_PENDING,
                $order->created_at?->toDateTimeString(),
            ),
            $this->trackingStep(
                'paid',
                'Pembayaran Diverifikasi',
                'Pembayaran sudah diverifikasi admin dan pesanan siap diproses.',
                $currentPosition >= 1,
                $order->status === Order::STATUS_PAID,
                $order->payment_paid_at?->toDateTimeString(),
            ),
            $this->trackingStep(
                'processed',
                'Pesanan Diproses',
                'Produk sedang disiapkan untuk pengiriman.',
                $currentPosition >= 2,
                $order->status === Order::STATUS_PROCESSED,
            ),
            $this->trackingStep(
                'shipped',
                'Pesanan Dikirim',
                $order->tracking_number
                    ? "Pesanan sudah dikirim via {$shippingCourierLabel} dengan resi {$order->tracking_number}."
                    : "Pesanan sudah masuk tahap pengiriman via {$shippingCourierLabel}.",
                $currentPosition >= 3,
                $order->status === Order::STATUS_SHIPPED,
            ),
            $this->trackingStep(
                'completed',
                'Pesanan Selesai',
                'Pembeli sudah mengonfirmasi pesanan diterima.',
                $currentPosition >= 4,
                $order->status === Order::STATUS_COMPLETED,
                $order->status === Order::STATUS_COMPLETED ? $order->status_updated_at?->toDateTimeString() : null,
            ),
        ];
    }

    private function trackingStep(
        string $key,
        string $label,
        string $description,
        bool $isCompleted,
        bool $isCurrent = false,
        ?string $date = null,
    ): array {
        return [
            'key' => $key,
            'label' => $label,
            'description' => $description,
            'is_completed' => $isCompleted,
            'is_current' => $isCurrent,
            'date' => $date,
        ];
    }

    private function shippingCourierLabel(?string $courier): string
    {
        return match ($courier) {
            Order::SHIPPING_COURIER_JNT => 'J&T',
            Order::SHIPPING_COURIER_JNE => 'JNE',
            default => $courier ? strtoupper($courier) : 'kurir',
        };
    }
}
