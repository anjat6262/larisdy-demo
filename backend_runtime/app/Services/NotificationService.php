<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;

class NotificationService
{
    private const LOW_STOCK_THRESHOLD = 5;

    public function orderCreated(Order $order): void
    {
        $order->loadMissing('user');

        if ($order->user) {
            $this->notifyUser(
                $order->user,
                'Order berhasil dibuat',
                "Pesanan {$order->code} berhasil dibuat.",
                'order_created',
                'order',
                $order->id,
            );

            $this->notifyUser(
                $order->user,
                'Menunggu pembayaran',
                "Silakan bayar pesanan {$order->code} sesuai total tagihan.",
                'payment_pending',
                'order',
                $order->id,
            );
        }

        $this->notifyAdmins(
            'Ada order baru',
            "Order {$order->code} masuk dari {$order->customer_name}.",
            'admin_order_created',
            'order',
            $order->id,
        );
    }

    public function paymentProofUploaded(Order $order): void
    {
        $order->loadMissing('user');

        if ($order->user) {
            $this->notifyUser(
                $order->user,
                'Bukti pembayaran terkirim',
                "Bukti pembayaran pesanan {$order->code} berhasil dikirim dan menunggu verifikasi.",
                'payment_proof_uploaded',
                'order',
                $order->id,
            );
        }

        $this->notifyAdmins(
            'Bukti pembayaran masuk',
            "Customer mengirim bukti pembayaran untuk pesanan {$order->code}.",
            'admin_payment_proof_uploaded',
            'order',
            $order->id,
        );
    }

    public function paymentProofVerified(Order $order): void
    {
        $order->loadMissing('user');

        if ($order->user) {
            $this->notifyUser(
                $order->user,
                'Bukti pembayaran diverifikasi',
                "Pembayaran pesanan {$order->code} sudah diverifikasi admin.",
                'payment_proof_verified',
                'order',
                $order->id,
            );
        }

        $this->notifyAdmins(
            'Pesanan perlu diproses',
            "Pembayaran {$order->code} sudah valid. Pesanan siap diproses.",
            'admin_order_needs_processing',
            'order',
            $order->id,
        );
    }

    public function paymentVerifiedByAdmin(Order $order): void
    {
        $order->loadMissing('user');

        if ($order->user) {
            $this->notifyUser(
                $order->user,
                'Pembayaran diverifikasi',
                "Pembayaran pesanan {$order->code} sudah diverifikasi admin.",
                'payment_verified',
                'order',
                $order->id,
            );
        }

        $this->notifyAdmins(
            'Pesanan perlu diproses',
            "Pembayaran {$order->code} sudah valid. Pesanan siap diproses.",
            'admin_order_needs_processing',
            'order',
            $order->id,
        );
    }

    public function paymentProofRejected(Order $order): void
    {
        $order->loadMissing('user');

        if ($order->user) {
            $this->notifyUser(
                $order->user,
                'Pembayaran ditolak',
                "Bukti pembayaran pesanan {$order->code} ditolak. Silakan kirim ulang bukti yang benar.",
                'payment_rejected',
                'order',
                $order->id,
            );
        }
    }

    public function webhookPaymentPaid(Order $order): void
    {
        $order->loadMissing('user');

        if ($order->user) {
            $this->notifyUser(
                $order->user,
                'Pembayaran berhasil',
                "Pembayaran pesanan {$order->code} berhasil diterima.",
                'payment_paid',
                'order',
                $order->id,
            );
        }

        $this->notifyAdmins(
            'Pembayaran berhasil dari webhook',
            "Webhook pembayaran untuk {$order->code} terkonfirmasi paid.",
            'admin_webhook_payment_paid',
            'order',
            $order->id,
        );

        $this->notifyAdmins(
            'Pesanan perlu diproses',
            "Pembayaran {$order->code} sudah valid. Pesanan siap diproses.",
            'admin_order_needs_processing',
            'order',
            $order->id,
        );
    }

    public function orderStatusUpdated(Order $order, ?string $previousStatus = null): void
    {
        if ($previousStatus === $order->status) {
            return;
        }

        $order->loadMissing('user');

        if (! $order->user) {
            return;
        }

        $statusMessages = [
            Order::STATUS_PROCESSED => [
                'Pesanan diproses',
                "Pesanan {$order->code} sedang diproses.",
                'order_processed',
            ],
            Order::STATUS_SHIPPED => [
                'Pesanan dikirim',
                "Pesanan {$order->code} sudah dikirim.",
                'order_shipped',
            ],
            Order::STATUS_COMPLETED => [
                'Pesanan selesai',
                "Pesanan {$order->code} sudah selesai.",
                'order_completed',
            ],
        ];

        if (! isset($statusMessages[$order->status])) {
            return;
        }

        [$title, $message, $type] = $statusMessages[$order->status];

        $this->notifyUser($order->user, $title, $message, $type, 'order', $order->id);
    }

    public function lowStock(Product $product, int $threshold = self::LOW_STOCK_THRESHOLD): void
    {
        if ($product->stock > $threshold || $product->status === Product::STATUS_ARCHIVED) {
            return;
        }

        $hasUnreadLowStockNotification = Notification::query()
            ->where('role_target', User::ROLE_ADMIN)
            ->where('type', 'admin_low_stock')
            ->where('reference_type', 'product')
            ->where('reference_id', $product->id)
            ->whereNull('read_at')
            ->exists();

        if ($hasUnreadLowStockNotification) {
            return;
        }

        $this->notifyAdmins(
            'Stok produk rendah',
            "Stok {$product->name} tersisa {$product->stock}.",
            'admin_low_stock',
            'product',
            $product->id,
        );
    }

    private function notifyUser(
        User $user,
        string $title,
        string $message,
        string $type,
        ?string $referenceType = null,
        ?int $referenceId = null,
    ): Notification {
        return Notification::query()->create([
            'user_id' => $user->id,
            'role_target' => $user->role,
            'title' => $title,
            'message' => $message,
            'type' => $type,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
        ]);
    }

    private function notifyAdmins(
        string $title,
        string $message,
        string $type,
        ?string $referenceType = null,
        ?int $referenceId = null,
    ): void {
        $admins = User::query()
            ->where('role', User::ROLE_ADMIN)
            ->get();

        if ($admins->isEmpty()) {
            Notification::query()->create([
                'user_id' => null,
                'role_target' => User::ROLE_ADMIN,
                'title' => $title,
                'message' => $message,
                'type' => $type,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
            ]);

            return;
        }

        foreach ($admins as $admin) {
            $this->notifyUser($admin, $title, $message, $type, $referenceType, $referenceId);
        }
    }
}
