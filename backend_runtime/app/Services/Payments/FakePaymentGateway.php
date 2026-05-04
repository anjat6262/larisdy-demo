<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Services\Payments\Contracts\PaymentGateway;

class FakePaymentGateway implements PaymentGateway
{
    public function providerName(): string
    {
        return 'fake';
    }

    public function createPayment(Order $order, string $finishUrl): array
    {
        $separator = str_contains($finishUrl, '?') ? '&' : '?';
        $bankVa = $order->payment_payload['bank_va'] ?? 'bca_va';
        $bankCode = str_replace('_va', '', $bankVa);
        $expiryTime = now()->addHours(24)->format('Y-m-d H:i:s');

        $rawPayload = [
            'bank_va' => $bankVa,
            'order_id' => $order->code,
            'transaction_status' => 'pending',
            'status_code' => '201',
            'redirect_url' => $finishUrl . $separator . 'simulate_paid=1',
            'expiry_time' => $expiryTime,
        ];

        if ($bankVa === 'mandiri_bill') {
            $rawPayload['biller_code'] = '70012';
            $rawPayload['bill_key'] = '8808' . str_pad((string) $order->id, 8, '0', STR_PAD_LEFT);
        } else {
            $rawPayload['va_numbers'] = [
                [
                    'bank' => $bankCode,
                    'va_number' => '8808' . str_pad((string) $order->id, 8, '0', STR_PAD_LEFT),
                ],
            ];
        }

        return [
            'provider' => $this->providerName(),
            'token' => 'FAKE-' . $order->code,
            'redirect_url' => $finishUrl . $separator . 'simulate_paid=1',
            'payment_status' => Order::PAYMENT_STATUS_PENDING,
            'raw' => $rawPayload,
            'expires_at' => $expiryTime,
        ];
    }

    public function getPaymentStatus(Order $order): array
    {
        return [
            'order_id' => $order->code,
            'transaction_status' => $order->payment_status ?? Order::PAYMENT_STATUS_PENDING,
            'status_code' => $order->status === Order::STATUS_PAID ? '200' : '201',
            'transaction_id' => $order->payment_reference ?? 'FAKE-' . $order->code,
            'gross_amount' => number_format((float) $order->grand_total, 2, '.', ''),
            'status_message' => $order->status === Order::STATUS_PAID
                ? 'Fake payment settled.'
                : 'Fake payment pending.',
        ];
    }

    public function verifyNotification(array $payload): bool
    {
        return true;
    }
}
