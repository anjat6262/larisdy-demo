<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_PAID = 'paid';
    public const STATUS_PROCESSED = 'processed';
    public const STATUS_SHIPPED = 'shipped';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';

    public const PAYMENT_STATUS_PENDING = 'pending';
    public const PAYMENT_STATUS_PAID = 'paid';
    public const PAYMENT_STATUS_EXPIRED = 'expired';
    public const PAYMENT_STATUS_FAILED = 'failed';

    public const PAYMENT_PROOF_STATUS_PENDING = 'pending';
    public const PAYMENT_PROOF_STATUS_VERIFIED = 'verified';
    public const PAYMENT_PROOF_STATUS_REJECTED = 'rejected';

    public const SHIPPING_COURIER_JNE = 'jne';
    public const SHIPPING_COURIER_JNT = 'jnt';

    public const SHIPPING_COURIERS = [
        self::SHIPPING_COURIER_JNE,
        self::SHIPPING_COURIER_JNT,
    ];

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_PAID,
        self::STATUS_PROCESSED,
        self::STATUS_SHIPPED,
        self::STATUS_COMPLETED,
        self::STATUS_CANCELLED,
    ];

    public const NEXT_STATUSES = [
        self::STATUS_PENDING => self::STATUS_PAID,
        self::STATUS_PAID => self::STATUS_PROCESSED,
        self::STATUS_PROCESSED => self::STATUS_SHIPPED,
        self::STATUS_SHIPPED => self::STATUS_COMPLETED,
    ];

    public const FAILED_PAYMENT_STATUSES = [
        'deny',
        'cancel',
        'failure',
        'failed',
    ];

    public const EXPIRED_PAYMENT_STATUSES = [
        'expire',
        'expired',
    ];

    public const SUCCESS_PAYMENT_STATUSES = [
        'capture',
        'settlement',
        'paid',
    ];

    protected $fillable = [
        'user_id',
        'code',
        'customer_name',
        'customer_email',
        'customer_phone',
        'shipping_address',
        'shipping_courier',
        'shipping_latitude',
        'shipping_longitude',
        'notes',
        'payment_method',
        'payment_provider',
        'payment_token',
        'payment_url',
        'payment_status',
        'payment_reference',
        'payment_status_message',
        'payment_payload',
        'payment_paid_at',
        'payment_expires_at',
        'subtotal',
        'shipping_cost',
        'grand_total',
        'status',
        'status_updated_at',
        'tracking_number',
    ];

    protected $casts = [
        'subtotal' => 'integer',
        'shipping_cost' => 'integer',
        'grand_total' => 'integer',
        'shipping_latitude' => 'float',
        'shipping_longitude' => 'float',
        'payment_payload' => 'array',
        'payment_paid_at' => 'datetime',
        'payment_expires_at' => 'datetime',
        'status_updated_at' => 'datetime',
    ];

    public function nextStatus(): ?string
    {
        $allowedTransitions = $this->allowedTransitions();

        return $allowedTransitions[0] ?? null;
    }

    public function allowedTransitions(): array
    {
        $allowedTransitions = [];
        $nextStatus = self::NEXT_STATUSES[$this->status] ?? null;

        if ($nextStatus) {
            $allowedTransitions[] = $nextStatus;
        }

        if (in_array($this->status, [self::STATUS_PENDING, self::STATUS_PAID], true)) {
            $allowedTransitions[] = self::STATUS_CANCELLED;
        }

        return array_values(array_unique($allowedTransitions));
    }

    public function canTransitionTo(string $status): bool
    {
        return in_array($status, $this->allowedTransitions(), true);
    }

    public function isPendingPaymentExpired(): bool
    {
        return $this->status === self::STATUS_PENDING
            && $this->payment_status !== self::PAYMENT_STATUS_PAID
            && $this->payment_expires_at
            && now()->greaterThanOrEqualTo($this->payment_expires_at);
    }

    public function expirePendingPaymentIfNeeded(): bool
    {
        if (! $this->isPendingPaymentExpired()) {
            return false;
        }

        $this->forceFill([
            'status' => self::STATUS_CANCELLED,
            'payment_status' => self::PAYMENT_STATUS_EXPIRED,
            'payment_status_message' => 'Batas pembayaran 24 jam sudah lewat.',
            'status_updated_at' => now(),
        ])->save();

        return true;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function testimonials()
    {
        return $this->hasMany(Testimonial::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function paymentProofs()
    {
        return $this->hasMany(PaymentProof::class);
    }

    public function paymentProof()
    {
        return $this->hasOne(PaymentProof::class)->latestOfMany();
    }

}
