<?php

use App\Models\Order;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            if (! Schema::hasColumn('orders', 'status_updated_at')) {
                $table->timestamp('status_updated_at')->nullable()->after('status');
            }
        });

        if (! Schema::hasColumn('orders', 'status')) {
            return;
        }

        $statusMap = [
            'Pending' => Order::STATUS_PENDING,
            'pending' => Order::STATUS_PENDING,
            'Paid' => Order::STATUS_PAID,
            'paid' => Order::STATUS_PAID,
            'Processed' => Order::STATUS_PROCESSED,
            'processed' => Order::STATUS_PROCESSED,
            'Shipped' => Order::STATUS_SHIPPED,
            'shipped' => Order::STATUS_SHIPPED,
            'Completed' => Order::STATUS_COMPLETED,
            'completed' => Order::STATUS_COMPLETED,
            'Cancelled' => Order::STATUS_CANCELLED,
            'cancelled' => Order::STATUS_CANCELLED,
        ];

        foreach ($statusMap as $legacyStatus => $normalizedStatus) {
            DB::table('orders')
                ->where('status', $legacyStatus)
                ->update([
                    'status' => $normalizedStatus,
                ]);
        }

        DB::table('orders')
            ->whereNull('status_updated_at')
            ->update([
                'status_updated_at' => DB::raw('COALESCE(updated_at, created_at)'),
            ]);
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            if (Schema::hasColumn('orders', 'status_updated_at')) {
                $table->dropColumn('status_updated_at');
            }
        });
    }
};
