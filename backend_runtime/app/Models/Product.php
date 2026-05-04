<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_INACTIVE = 'inactive';
    public const STATUS_ARCHIVED = 'archived';

    public const STATUSES = [
        self::STATUS_ACTIVE,
        self::STATUS_INACTIVE,
        self::STATUS_ARCHIVED,
    ];

    protected $fillable = [
        'name',
        'description',
        'price',
        'image',
        'category',
        'spicy_level',
        'weight',
        'stock',
        'status',
    ];

    protected $casts = [
        'price' => 'integer',
        'spicy_level' => 'integer',
        'stock' => 'integer',
    ];

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function testimonials()
    {
        return $this->hasMany(Testimonial::class);
    }
}
