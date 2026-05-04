<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'role_target',
        'title',
        'message',
        'type',
        'reference_type',
        'reference_id',
        'read_at',
    ];

    protected $casts = [
        'reference_id' => 'integer',
        'read_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
