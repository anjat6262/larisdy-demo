<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->string('payment_provider', 50)->nullable()->after('payment_method');
            $table->string('payment_token')->nullable()->after('payment_provider');
            $table->text('payment_url')->nullable()->after('payment_token');
            $table->string('payment_status', 50)->nullable()->after('payment_url');
            $table->string('payment_reference')->nullable()->after('payment_status');
            $table->string('payment_status_message')->nullable()->after('payment_reference');
            $table->json('payment_payload')->nullable()->after('payment_status_message');
            $table->timestamp('payment_paid_at')->nullable()->after('payment_payload');
            $table->timestamp('payment_expires_at')->nullable()->after('payment_paid_at');
            $table->string('tracking_number')->nullable()->after('status_updated_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->dropColumn([
                'payment_provider',
                'payment_token',
                'payment_url',
                'payment_status',
                'payment_reference',
                'payment_status_message',
                'payment_payload',
                'payment_paid_at',
                'payment_expires_at',
                'tracking_number',
            ]);
        });
    }
};
