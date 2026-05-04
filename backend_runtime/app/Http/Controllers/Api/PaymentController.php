<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\OrderStatusUpdatedMail;
use App\Models\Order;
use App\Services\NotificationService;
use App\Services\Payments\OrderPaymentSynchronizer;
use App\Services\Payments\PaymentGatewayManager;
use App\Support\SendsAppMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Exceptions\HttpResponseException;
use RuntimeException;

class PaymentController extends Controller
{
    use SendsAppMail;

    private PaymentGatewayManager $paymentGatewayManager;
    private OrderPaymentSynchronizer $paymentSynchronizer;

    public function __construct(
        PaymentGatewayManager $paymentGatewayManager,
        OrderPaymentSynchronizer $paymentSynchronizer,
        private NotificationService $notifications,
    ) {
        $this->paymentGatewayManager = $paymentGatewayManager;
        $this->paymentSynchronizer = $paymentSynchronizer;
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => ['required', 'integer', 'exists:orders,id'],
            'frontend_origin' => ['nullable', 'url'],
        ]);

        $order = Order::query()
            ->with(['user', 'items.product'])
            ->findOrFail($validated['order_id']);

        if ((int) $order->user_id !== (int) $request->user()->id) {
            throw new HttpResponseException(response()->json([
                'message' => 'Akses ditolak untuk pesanan ini.',
            ], 403));
        }

        if ($order->payment_status === Order::PAYMENT_STATUS_EXPIRED) {
            return response()->json([
                'message' => 'Batas pembayaran 24 jam sudah lewat. Pesanan dibatalkan otomatis.',
                'data' => $order->fresh(['user', 'items.product', 'paymentProof']),
            ], 422);
        }

        if ($order->expirePendingPaymentIfNeeded()) {
            return response()->json([
                'message' => 'Batas pembayaran 24 jam sudah lewat. Pesanan dibatalkan otomatis.',
                'data' => $order->fresh(['user', 'items.product', 'paymentProof']),
            ], 422);
        }

        if (in_array($order->status, [Order::STATUS_COMPLETED, Order::STATUS_CANCELLED], true)) {
            return response()->json([
                'message' => 'Pesanan ini tidak lagi dapat diproses pembayarannya.',
                'data' => $order,
            ], 422);
        }

        if ($this->isManualPaymentMethod($order->payment_method)) {
            $label = $order->payment_method === 'bank_transfer_bca'
                ? 'Transfer BCA'
                : 'QRIS';

            return response()->json([
                'message' => "Instruksi pembayaran {$label} tersedia.",
                'data' => [
                    'provider' => null,
                    'token' => null,
                    'payment_url' => null,
                    'order' => $order->fresh(['user', 'items.product']),
                ],
            ]);
        }

        if ($order->payment_method !== 'virtual_account') {
            return response()->json([
                'message' => 'Metode pembayaran tidak didukung.',
                'data' => $order,
            ], 422);
        }

        if ($this->requiresBankVirtualAccount($order) && empty(($order->payment_payload ?? [])['bank_va'])) {
            return response()->json([
                'message' => 'Pilih bank Virtual Account terlebih dahulu.',
                'data' => $order,
            ], 422);
        }

        if ($this->hasVirtualAccountInstruction($order)) {
            return response()->json([
                'message' => 'Instruksi pembayaran Virtual Account tersedia.',
                'data' => [
                    'provider' => $order->payment_provider,
                    'token' => $order->payment_token,
                    'payment_url' => $order->payment_url,
                    'order' => $order->fresh(['user', 'items.product']),
                ],
            ]);
        }

        $gateway = $this->paymentGatewayManager->driver();
        $finishUrl = $this->resolveFrontendBaseUrl($request, $validated) . '/payment-status?order=' . $order->id;
        try {
            $paymentData = $gateway->createPayment($order, $finishUrl);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
                'data' => $order,
            ], 422);
        }

        $paymentPayload = $this->mergePaymentPayload($order->payment_payload, $paymentData['raw'] ?? null);

        $order->update([
            'payment_provider' => $paymentData['provider'],
            'payment_token' => $paymentData['token'] ?? $order->payment_token,
            'payment_url' => $paymentData['redirect_url'] ?? $order->payment_url,
            'payment_status' => $paymentData['payment_status'] ?? $order->payment_status ?? Order::PAYMENT_STATUS_PENDING,
            'payment_payload' => $paymentPayload,
            'payment_expires_at' => $paymentData['expires_at'] ?? $order->payment_expires_at,
        ]);

        return response()->json([
            'message' => 'Link pembayaran berhasil dibuat.',
            'data' => [
                'provider' => $order->payment_provider,
                'token' => $order->payment_token,
                'payment_url' => $order->payment_url,
                'order' => $order->fresh(['user', 'items.product']),
            ],
        ]);
    }

    public function status(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => ['required', 'integer', 'exists:orders,id'],
        ]);

        $order = Order::query()
            ->with(['user', 'items.product'])
            ->findOrFail($validated['order_id']);

        if ((int) $order->user_id !== (int) $request->user()->id) {
            throw new HttpResponseException(response()->json([
                'message' => 'Akses ditolak untuk pesanan ini.',
            ], 403));
        }

        if ($order->payment_status === Order::PAYMENT_STATUS_EXPIRED) {
            return response()->json([
                'message' => 'Batas pembayaran 24 jam sudah lewat. Pesanan dibatalkan otomatis.',
                'data' => $order->fresh(['user', 'items.product', 'paymentProof']),
            ], 422);
        }

        if ($order->expirePendingPaymentIfNeeded()) {
            return response()->json([
                'message' => 'Batas pembayaran 24 jam sudah lewat. Pesanan dibatalkan otomatis.',
                'data' => $order->fresh(['user', 'items.product', 'paymentProof']),
            ], 422);
        }

        if (! $order->payment_provider) {
            if ($this->isManualPaymentMethod($order->payment_method)) {
                return response()->json([
                    'message' => 'Status pembayaran menunggu upload bukti dan verifikasi admin.',
                    'data' => $order,
                ]);
            }

            return response()->json([
                'message' => 'Pembayaran belum dibuat untuk pesanan ini.',
                'data' => $order,
            ], 422);
        }

        $gateway = $this->paymentGatewayManager->driver($order->payment_provider);

        try {
            $statusPayload = $gateway->getPaymentStatus($order);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
                'data' => $order,
            ], 422);
        }

        $gatewayStatus = strtolower((string) ($statusPayload['transaction_status'] ?? $order->payment_status ?? Order::PAYMENT_STATUS_PENDING));

        return response()->json([
            'message' => in_array($gatewayStatus, Order::SUCCESS_PAYMENT_STATUSES, true)
                ? 'Pembayaran terdeteksi sukses di Midtrans. Status order akan menjadi paid setelah webhook valid diterima.'
                : 'Status pembayaran berhasil dicek.',
            'data' => $order->fresh(['user', 'items.product']),
            'gateway_status' => $gatewayStatus,
        ]);
    }

    public function callback(Request $request): JsonResponse
    {
        $payload = $request->all();
        $order = Order::query()
            ->with(['user', 'items.product'])
            ->where('code', $payload['order_id'] ?? null)
            ->first();

        if (! $order) {
            return response()->json([
                'message' => 'Pesanan tidak ditemukan.',
            ], 404);
        }

        if ($this->isManualPaymentMethod($order->payment_method)) {
            return response()->json([
                'message' => 'Pembayaran manual diverifikasi oleh admin.',
            ], 422);
        }

        $gateway = $this->paymentGatewayManager->driver($order->payment_provider ?: null);

        if (! $gateway->verifyNotification($payload)) {
            return response()->json([
                'message' => 'Signature callback pembayaran tidak valid.',
            ], 403);
        }

        $statusPayload = $gateway->providerName() === 'midtrans'
            ? $gateway->getPaymentStatus($order)
            : $payload;

        $syncResult = $this->paymentSynchronizer->sync($order, $statusPayload);

        $this->sendStatusMailWhenChanged($syncResult);
        $this->createWebhookNotificationsWhenPaid($syncResult);

        return response()->json([
            'message' => 'Status pembayaran berhasil diproses.',
            'data' => $syncResult['order'],
        ]);
    }

    private function resolveFrontendBaseUrl(Request $request, array $validated): string
    {
        $explicitOrigin = $validated['frontend_origin'] ?? null;

        if ($this->isAllowedFrontendOrigin($explicitOrigin)) {
            return rtrim($explicitOrigin, '/');
        }

        $originHeader = $request->headers->get('origin');

        if ($this->isAllowedFrontendOrigin($originHeader)) {
            return rtrim($originHeader, '/');
        }

        $refererHeader = $request->headers->get('referer');

        if ($this->isAllowedFrontendOrigin($refererHeader)) {
            $parsedReferer = parse_url($refererHeader);

            if (! empty($parsedReferer['scheme']) && ! empty($parsedReferer['host'])) {
                $port = isset($parsedReferer['port']) ? ':' . $parsedReferer['port'] : '';

                return $parsedReferer['scheme'] . '://' . $parsedReferer['host'] . $port;
            }
        }

        return rtrim((string) config('payment.frontend_url'), '/');
    }

    private function requiresBankVirtualAccount(Order $order): bool
    {
        return $order->payment_method === 'virtual_account';
    }

    private function isManualPaymentMethod(?string $paymentMethod): bool
    {
        return in_array($paymentMethod, ['qris_manual', 'bank_transfer_bca'], true);
    }

    private function hasVirtualAccountInstruction(Order $order): bool
    {
        if ($order->payment_method !== 'virtual_account') {
            return false;
        }

        $paymentPayload = $order->payment_payload ?? [];

        if (! is_array($paymentPayload)) {
            return false;
        }

        return ! empty($paymentPayload['va_numbers'])
            || ! empty($paymentPayload['bill_key']);
    }

    private function mergePaymentPayload(?array $currentPayload, mixed $gatewayPayload): ?array
    {
        if (! is_array($gatewayPayload)) {
            return $currentPayload;
        }

        return array_replace($currentPayload ?? [], $gatewayPayload);
    }

    private function sendStatusMailWhenChanged(array $syncResult): void
    {
        if (! $syncResult['status_changed']) {
            return;
        }

        $this->sendMailSilently(
            $syncResult['order']->customer_email,
            new OrderStatusUpdatedMail($syncResult['order'], $syncResult['previous_status']),
        );
    }

    private function createWebhookNotificationsWhenPaid(array $syncResult): void
    {
        if (! $syncResult['status_changed']) {
            return;
        }

        if ($syncResult['order']->payment_status !== Order::PAYMENT_STATUS_PAID) {
            return;
        }

        $this->notifications->webhookPaymentPaid($syncResult['order']);
    }

    private function isAllowedFrontendOrigin(?string $url): bool
    {
        if (! $url) {
            return false;
        }

        $parsedUrl = parse_url($url);

        if (! is_array($parsedUrl) || empty($parsedUrl['scheme']) || empty($parsedUrl['host'])) {
            return false;
        }

        return in_array($parsedUrl['scheme'], ['http', 'https'], true);
    }
}
