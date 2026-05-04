<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\Product;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class OrderPaymentSynchronizer
{
    public function __construct(private NotificationService $notifications)
    {
    }

    public function sync(Order $order, array $payload): array
    {
        return DB::transaction(function () use ($order, $payload): array {
            $order = Order::query()
                ->with(['items.product'])
                ->lockForUpdate()
                ->findOrFail($order->id);

            $currentPayload = is_array($order->payment_payload) ? $order->payment_payload : [];
            $payload = array_replace($currentPayload, $payload);
            $gatewayStatus = strtolower((string) ($payload['transaction_status'] ?? $order->payment_status ?? Order::PAYMENT_STATUS_PENDING));
            $paymentStatus = $this->normalizePaymentStatus($gatewayStatus);
            $previousStatus = $order->status;
            $statusChanged = false;

            $updates = [
                'payment_status' => $paymentStatus,
                'payment_reference' => $payload['transaction_id'] ?? $order->payment_reference,
                'payment_status_message' => $payload['status_message'] ?? $order->payment_status_message,
                'payment_payload' => $payload,
                'payment_expires_at' => $this->resolveExpiryTime($payload) ?? $order->payment_expires_at,
            ];

            if ($paymentStatus === Order::PAYMENT_STATUS_PAID) {
                $updates['status'] = $order->status === Order::STATUS_PENDING
                    ? Order::STATUS_PAID
                    : $order->status;
                $updates['payment_paid_at'] = $this->resolvePaidTime($payload) ?? now();
            }

            if (in_array($paymentStatus, [Order::PAYMENT_STATUS_EXPIRED, Order::PAYMENT_STATUS_FAILED], true)
                && $order->status === Order::STATUS_PENDING) {
                $updates['status'] = Order::STATUS_CANCELLED;
            }

            $nextStatus = $updates['status'] ?? $order->status;
            $shouldDeductStock = $order->status === Order::STATUS_PENDING && $nextStatus === Order::STATUS_PAID;

            if ($nextStatus !== $order->status) {
                $statusChanged = true;
                $updates['status_updated_at'] = now();
            }

            $order->fill($updates);
            $order->save();

            if ($shouldDeductStock) {
                $this->deductStockForPaidOrder($order);
            }

            return [
                'order' => $order->fresh(['user', 'items.product']),
                'previous_status' => $previousStatus,
                'status_changed' => $statusChanged,
            ];
        });
    }

    private function normalizePaymentStatus(string $gatewayStatus): string
    {
        if (in_array($gatewayStatus, Order::SUCCESS_PAYMENT_STATUSES, true)) {
            return Order::PAYMENT_STATUS_PAID;
        }

        if (in_array($gatewayStatus, Order::EXPIRED_PAYMENT_STATUSES, true)) {
            return Order::PAYMENT_STATUS_EXPIRED;
        }

        if (in_array($gatewayStatus, Order::FAILED_PAYMENT_STATUSES, true)) {
            return Order::PAYMENT_STATUS_FAILED;
        }

        return Order::PAYMENT_STATUS_PENDING;
    }

    private function resolvePaidTime(array $payload): ?Carbon
    {
        return $this->parseDateTime($payload['settlement_time'] ?? $payload['transaction_time'] ?? null);
    }

    private function resolveExpiryTime(array $payload): ?Carbon
    {
        return $this->parseDateTime($payload['expiry_time'] ?? null);
    }

    private function parseDateTime(?string $value): ?Carbon
    {
        if (! $value) {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }

    private function deductStockForPaidOrder(Order $order): void
    {
        foreach ($order->items as $item) {
            $product = Product::query()
                ->lockForUpdate()
                ->find($item->product_id);

            if (! $product) {
                continue;
            }

            if ($product->stock < $item->quantity) {
                throw new RuntimeException("Stok {$product->name} tidak mencukupi untuk memproses pembayaran.");
            }

            $product->decrement('stock', $item->quantity);
            $this->notifications->lowStock($product->fresh());
        }
    }
}
