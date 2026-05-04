<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Testimonial;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TestimonialController extends Controller
{
    private const ELIGIBILITY_MESSAGE = 'Anda harus menyelesaikan pesanan produk ini sebelum memberikan review.';

    public function index(Request $request): JsonResponse
    {
        $testimonials = Testimonial::query()
            ->with('product')
            ->where('is_published', true)
            ->when($request->filled('product_id'), function ($query) use ($request): void {
                $query->where('product_id', $request->integer('product_id'));
            })
            ->latest()
            ->get();

        return response()->json([
            'data' => $testimonials,
        ]);
    }

    public function eligibility(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
        ]);

        $user = $request->user();
        $product = Product::query()
            ->where('status', Product::STATUS_ACTIVE)
            ->findOrFail($validated['product_id']);
        $eligibleOrder = $this->eligibleReviewOrder($user->id, $product->id);
        $canSubmit = $eligibleOrder !== null;

        return response()->json([
            'data' => [
                'can_submit' => $canSubmit,
                'eligible_order_id' => $eligibleOrder?->id,
                'completed_orders_count' => $this->completedProductOrdersCount($user->id, $product->id),
                'message' => $canSubmit
                    ? 'Anda bisa memberikan review karena sudah menyelesaikan pesanan produk ini.'
                    : self::ELIGIBILITY_MESSAGE,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'order_id' => ['required', 'integer', 'exists:orders,id'],
            'city' => ['nullable', 'string', 'max:255'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'message' => ['required', 'string', 'min:10'],
            'image' => ['nullable', 'image', 'max:2048'],
        ]);

        $order = Order::query()
            ->with('items')
            ->where('user_id', $user->id)
            ->whereKey($validated['order_id'])
            ->first();

        if (! $order || $order->status !== Order::STATUS_COMPLETED) {
            return response()->json([
                'message' => self::ELIGIBILITY_MESSAGE,
            ], Response::HTTP_FORBIDDEN);
        }

        $hasProductInOrder = $order->items
            ->contains(fn ($item): bool => (int) $item->product_id === (int) $validated['product_id']);

        if (! $hasProductInOrder) {
            return response()->json([
                'message' => 'Produk ini tidak ada di pesanan yang dipilih.',
            ], 422);
        }

        $alreadyReviewed = Testimonial::query()
            ->where('user_id', $user->id)
            ->where('product_id', $validated['product_id'])
            ->where('order_id', $order->id)
            ->exists();

        if ($alreadyReviewed) {
            return response()->json([
                'message' => 'Produk pada pesanan ini sudah pernah direview.',
            ], 422);
        }

        $imagePath = $request->hasFile('image')
            ? $request->file('image')->store('testimonials', 'public')
            : null;

        $testimonial = Testimonial::query()->create([
            'user_id' => $user->id,
            'product_id' => $validated['product_id'],
            'order_id' => $order->id,
            'name' => $user->name,
            'email' => $user->email,
            'city' => $validated['city'] ?? null,
            'rating' => $validated['rating'],
            'message' => $validated['message'],
            'image' => $imagePath,
            'is_published' => true,
        ]);

        return response()->json([
            'message' => 'Review produk berhasil dikirim.',
            'data' => $testimonial->fresh(['product']),
        ], 201);
    }

    private function eligibleReviewOrder(int $userId, int $productId): ?Order
    {
        $reviewedOrderIds = Testimonial::query()
            ->where('user_id', $userId)
            ->where('product_id', $productId)
            ->whereNotNull('order_id')
            ->pluck('order_id')
            ->all();

        return Order::query()
            ->where('user_id', $userId)
            ->where('status', Order::STATUS_COMPLETED)
            ->whereHas('items', function ($query) use ($productId): void {
                $query->where('product_id', $productId);
            })
            ->when(count($reviewedOrderIds) > 0, function ($query) use ($reviewedOrderIds): void {
                $query->whereNotIn('id', $reviewedOrderIds);
            })
            ->latest()
            ->first();
    }

    private function completedProductOrdersCount(int $userId, int $productId): int
    {
        return Order::query()
            ->where('user_id', $userId)
            ->where('status', Order::STATUS_COMPLETED)
            ->whereHas('items', function ($query) use ($productId): void {
                $query->where('product_id', $productId);
            })
            ->count();
    }
}
