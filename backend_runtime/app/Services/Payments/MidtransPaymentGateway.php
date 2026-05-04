<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Services\Payments\Contracts\PaymentGateway;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class MidtransPaymentGateway implements PaymentGateway
{
    public function providerName(): string
    {
        return 'midtrans';
    }

    public function createPayment(Order $order, string $finishUrl): array
    {
        if (! $this->usesBankVirtualAccount($order)) {
            throw new RuntimeException('Larisdy hanya menerima pembayaran Virtual Account Bank via Midtrans.');
        }

        return $this->createVirtualAccountPayment($order, $finishUrl);
    }

    private function createVirtualAccountPayment(Order $order, string $finishUrl): array
    {
        $bankVa = $this->selectedBankVirtualAccount($order);
        $enabledPayments = $this->enabledPaymentsFor($order);
        $payload = array_replace($this->baseTransactionPayload($order), [
            'enabled_payments' => $enabledPayments,
            'custom_expiry' => $this->customExpiry(),
        ]);

        if ($bankVa === 'mandiri_bill') {
            $payload['payment_type'] = 'echannel';
            $payload['echannel'] = [
                'bill_info1' => 'Payment For:',
                'bill_info2' => 'Larisdy Order',
            ];
        } else {
            $payload['payment_type'] = 'bank_transfer';
            $payload['bank_transfer'] = [
                'bank' => $this->bankTransferCode($bankVa),
            ];
        }

        $response = Http::withBasicAuth($this->serverKey(), '')
            ->acceptJson()
            ->asJson()
            ->post($this->midtransApiBaseUrl() . '/v2/charge', $payload);

        if ($response->failed()) {
            throw new RuntimeException($this->midtransErrorMessage($response->json()));
        }

        $rawPayload = $response->json() ?? [];
        $expiryTime = $rawPayload['expiry_time']
            ?? now()->addHours((int) config('payment.midtrans.expiry_duration', 24))->format('Y-m-d H:i:s');

        return [
            'provider' => $this->providerName(),
            'token' => $rawPayload['transaction_id'] ?? $order->code,
            'redirect_url' => $finishUrl,
            'payment_status' => Order::PAYMENT_STATUS_PENDING,
            'expires_at' => $expiryTime,
            'raw' => array_replace($rawPayload, [
                'bank_va' => $bankVa,
                'enabled_payments' => $enabledPayments,
                'expiry_time' => $expiryTime,
            ]),
        ];
    }

    public function getPaymentStatus(Order $order): array
    {
        $response = Http::withBasicAuth($this->serverKey(), '')
            ->acceptJson()
            ->get($this->midtransApiBaseUrl() . '/v2/' . urlencode($order->code) . '/status');

        if ($response->failed()) {
            throw new RuntimeException($response->json('status_message') ?? 'Gagal mengambil status pembayaran Midtrans.');
        }

        return $response->json();
    }

    public function verifyNotification(array $payload): bool
    {
        $receivedSignature = (string) ($payload['signature_key'] ?? '');
        $expectedSignature = hash(
            'sha512',
            (string) ($payload['order_id'] ?? '')
            . (string) ($payload['status_code'] ?? '')
            . (string) ($payload['gross_amount'] ?? '')
            . $this->serverKey(),
        );

        return hash_equals($expectedSignature, $receivedSignature);
    }

    private function midtransApiBaseUrl(): string
    {
        return $this->isProduction()
            ? 'https://api.midtrans.com'
            : 'https://api.sandbox.midtrans.com';
    }

    private function isProduction(): bool
    {
        return (bool) config('payment.midtrans.is_production', false);
    }

    private function enabledPaymentsFor(Order $order): array
    {
        $bankVa = $this->selectedBankVirtualAccount($order);

        if (! $bankVa) {
            throw new RuntimeException('Pilih bank Virtual Account terlebih dahulu.');
        }

        if (! in_array($bankVa, config('payment.midtrans.virtual_account_banks', []), true)) {
            throw new RuntimeException('Bank Virtual Account yang dipilih tidak didukung.');
        }

        return [$bankVa];
    }

    private function usesBankVirtualAccount(Order $order): bool
    {
        return $order->payment_method === 'virtual_account';
    }

    private function selectedBankVirtualAccount(Order $order): ?string
    {
        if (! $this->usesBankVirtualAccount($order)) {
            return null;
        }

        $paymentPayload = $order->payment_payload ?? [];

        return is_array($paymentPayload) ? ($paymentPayload['bank_va'] ?? null) : null;
    }

    private function bankTransferCode(?string $bankVa): string
    {
        return match ($bankVa) {
            'bca_va' => 'bca',
            'bni_va' => 'bni',
            'bri_va' => 'bri',
            'permata_va' => 'permata',
            default => throw new RuntimeException('Bank Virtual Account yang dipilih tidak didukung.'),
        };
    }

    private function baseTransactionPayload(Order $order): array
    {
        return [
            'transaction_details' => [
                'order_id' => $order->code,
                'gross_amount' => $order->grand_total,
            ],
            'customer_details' => [
                'first_name' => $order->customer_name,
                'email' => $order->customer_email,
                'phone' => $order->customer_phone,
                'billing_address' => [
                    'address' => $order->shipping_address,
                ],
                'shipping_address' => [
                    'address' => $order->shipping_address,
                ],
            ],
            'item_details' => $this->itemDetails($order),
        ];
    }

    private function itemDetails(Order $order): array
    {
        return $order->items->map(function ($item): array {
            return [
                'id' => (string) $item->product_id,
                'price' => (int) $item->price,
                'quantity' => (int) $item->quantity,
                'name' => $item->product?->name ?? 'Produk Larisdy',
                'category' => $item->product?->category ?? 'Produk',
            ];
        })->push([
            'id' => 'shipping',
            'price' => (int) $order->shipping_cost,
            'quantity' => 1,
            'name' => 'Biaya Pengiriman',
            'category' => 'Pengiriman',
        ])->values()->all();
    }

    private function customExpiry(): array
    {
        return [
            'order_time' => now()->format('Y-m-d H:i:s O'),
            'expiry_duration' => (int) config('payment.midtrans.expiry_duration', 24),
            'unit' => 'hour',
        ];
    }

    private function midtransErrorMessage(?array $payload): string
    {
        return $payload['error_messages'][0]
            ?? $payload['status_message']
            ?? 'Gagal membuat transaksi Midtrans.';
    }

    private function serverKey(): string
    {
        $serverKey = trim((string) config('payment.midtrans.server_key'));

        if ($serverKey === '') {
            throw new RuntimeException('MIDTRANS_SERVER_KEY belum diatur.');
        }

        return $serverKey;
    }
}
