<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('code')->unique();
            $table->string('customer_name');
            $table->string('customer_email');
            $table->string('customer_phone', 50);
            $table->text('shipping_address');
            $table->text('notes')->nullable();
            $table->string('payment_method', 30);
            $table->unsignedInteger('subtotal');
            $table->unsignedInteger('shipping_cost')->default(15000);
            $table->unsignedInteger('grand_total');
            $table->string('status', 30)->default('pending');
            $table->timestamp('status_updated_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
