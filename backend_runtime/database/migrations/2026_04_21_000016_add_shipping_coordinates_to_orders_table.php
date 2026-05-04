<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->decimal('shipping_latitude', 10, 7)->nullable()->after('shipping_address');
            $table->decimal('shipping_longitude', 10, 7)->nullable()->after('shipping_latitude');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->dropColumn([
                'shipping_latitude',
                'shipping_longitude',
            ]);
        });
    }
};
