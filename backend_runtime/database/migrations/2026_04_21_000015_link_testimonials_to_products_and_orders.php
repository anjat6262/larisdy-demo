<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('testimonials', function (Blueprint $table): void {
            $table->foreignId('product_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            $table->foreignId('order_id')->nullable()->after('product_id')->constrained()->nullOnDelete();
            $table->unique(['user_id', 'product_id', 'order_id'], 'testimonials_user_product_order_unique');
        });
    }

    public function down(): void
    {
        Schema::table('testimonials', function (Blueprint $table): void {
            $table->dropUnique('testimonials_user_product_order_unique');
            $table->dropConstrainedForeignId('order_id');
            $table->dropConstrainedForeignId('product_id');
        });
    }
};
