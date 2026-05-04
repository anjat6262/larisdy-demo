<?php

namespace App\Services\Payments;

use App\Services\Payments\Contracts\PaymentGateway;
use RuntimeException;

class PaymentGatewayManager
{
    public function driver(?string $provider = null): PaymentGateway
    {
        $selectedProvider = $provider ?: (string) config('payment.provider', 'midtrans');

        return match ($selectedProvider) {
            'fake' => new FakePaymentGateway(),
            'midtrans' => new MidtransPaymentGateway(),
            default => throw new RuntimeException("Payment provider {$selectedProvider} tidak didukung."),
        };
    }
}
