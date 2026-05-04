<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OrderStatusUpdatedMail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public Order $order,
        public string $previousStatus,
    ) {
    }

    public function build(): self
    {
        return $this
            ->subject('Status pesanan Anda diperbarui')
            ->view('emails.order-status-updated');
    }
}
