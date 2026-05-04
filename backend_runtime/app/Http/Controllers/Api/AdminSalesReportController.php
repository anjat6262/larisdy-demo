<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminSalesReportController extends Controller
{
    public function salesSummary(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'product_id' => ['nullable', 'integer', 'exists:products,id'],
        ]);

        $query = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id');

        $this->applyPaidOrderFilter($query);
        $this->applyRequestFilters($query, $validated);

        $summary = (clone $query)
            ->selectRaw('COALESCE(SUM(order_items.quantity), 0) as total_products_sold')
            ->selectRaw('COALESCE(SUM(order_items.line_total), 0) as total_revenue')
            ->selectRaw('COUNT(DISTINCT orders.id) as total_orders_paid')
            ->first();

        $productsSold = (clone $query)
            ->leftJoin('products', 'products.id', '=', 'order_items.product_id')
            ->select('order_items.product_id')
            ->selectRaw('products.name as product_name')
            ->selectRaw('products.category as category')
            ->selectRaw('COALESCE(SUM(order_items.quantity), 0) as total_quantity')
            ->selectRaw('COALESCE(SUM(order_items.line_total), 0) as total_revenue')
            ->selectRaw('COUNT(DISTINCT orders.id) as order_count')
            ->groupBy('order_items.product_id', 'products.name', 'products.category')
            ->orderByDesc('total_quantity')
            ->orderByDesc('total_revenue')
            ->get()
            ->map(fn ($product): array => [
                'product_id' => (int) $product->product_id,
                'product_name' => (string) ($product->product_name ?: 'Produk #' . $product->product_id),
                'category' => (string) ($product->category ?: '-'),
                'total_quantity' => (int) $product->total_quantity,
                'total_revenue' => (int) $product->total_revenue,
                'order_count' => (int) $product->order_count,
            ])
            ->values()
            ->all();

        return response()->json([
            'total_products_sold' => (int) ($summary->total_products_sold ?? 0),
            'total_revenue' => (int) ($summary->total_revenue ?? 0),
            'total_orders_paid' => (int) ($summary->total_orders_paid ?? 0),
            'products_sold' => $productsSold,
        ]);
    }

    private function applyPaidOrderFilter(Builder $query): void
    {
        $query
            ->where(function (Builder $query): void {
                $query
                    ->whereIn('orders.status', [
                        Order::STATUS_PAID,
                        Order::STATUS_PROCESSED,
                        Order::STATUS_SHIPPED,
                        Order::STATUS_COMPLETED,
                    ])
                    ->orWhereIn('orders.payment_status', [
                        Order::PAYMENT_STATUS_PAID,
                        'settlement',
                        'capture',
                    ]);
            })
            ->where('orders.status', '!=', Order::STATUS_CANCELLED)
            ->where(function (Builder $query): void {
                $query
                    ->whereNull('orders.payment_status')
                    ->orWhereNotIn('orders.payment_status', [
                        Order::PAYMENT_STATUS_PENDING,
                        Order::PAYMENT_STATUS_EXPIRED,
                        Order::PAYMENT_STATUS_FAILED,
                        'expire',
                        'deny',
                        'cancel',
                        'failure',
                    ]);
            });
    }

    private function applyRequestFilters(Builder $query, array $validated): void
    {
        if (! empty($validated['date_from'])) {
            $query->whereRaw(
                'date(COALESCE(orders.payment_paid_at, orders.status_updated_at, orders.created_at)) >= ?',
                [Carbon::parse($validated['date_from'])->toDateString()],
            );
        }

        if (! empty($validated['date_to'])) {
            $query->whereRaw(
                'date(COALESCE(orders.payment_paid_at, orders.status_updated_at, orders.created_at)) <= ?',
                [Carbon::parse($validated['date_to'])->toDateString()],
            );
        }

        if (! empty($validated['product_id'])) {
            $query->where('order_items.product_id', $validated['product_id']);
        }
    }
}
