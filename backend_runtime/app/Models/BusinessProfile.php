<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BusinessProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_name',
        'history',
        'vision',
        'missions',
        'support_email',
        'support_phone',
        'address',
        'hero_title',
        'hero_subtitle',
    ];

    protected $casts = [
        'missions' => 'array',
    ];
}
