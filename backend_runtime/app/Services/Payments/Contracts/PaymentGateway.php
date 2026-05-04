<?php

namespace App\Services\Payments\Contracts;

use App\Models\Order;

interface PaymentGateway
{
    public function providerName(): string;

    public function createPayment(Order $order, string $finishUrl): array;

    public function getPaymentStatus(Order $order): array;

    public function verifyNotification(array $payload): bool;
}
