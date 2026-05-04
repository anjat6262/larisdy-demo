<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\NotificationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class ProductController extends Controller
{
    public function __construct(private NotificationService $notifications)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = $this->withReviewSummary(Product::query()
            ->where('status', Product::STATUS_ACTIVE)
            ->orderBy('name'));
        $category = $request->input('category');

        if ($category && $category !== 'Semua') {
            $query->where('category', $category);
        }

        $products = $query
            ->get()
            ->map(fn (Product $product): array => $this->productPayload($product))
            ->values();

        return response()->json([
            'data' => $products,
            'meta' => [
                'categories' => $this->categoriesFor(Product::query()->where('status', Product::STATUS_ACTIVE)),
            ],
        ]);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $includeArchived = $request->boolean('include_archived');
        $baseQuery = Product::query();

        if (! $includeArchived) {
            $baseQuery->where('status', '!=', Product::STATUS_ARCHIVED);
        }

        $query = (clone $baseQuery)->orderBy('name');
        $category = $request->input('category');

        if ($category && $category !== 'Semua') {
            $query->where('category', $category);
        }

        return response()->json([
            'data' => $query->get(),
            'meta' => [
                'categories' => $this->categoriesFor($baseQuery),
                'statuses' => Product::STATUSES,
            ],
        ]);
    }

    public function show(Product $product): JsonResponse
    {
        if ($product->status !== Product::STATUS_ACTIVE) {
            return response()->json([
                'message' => 'Produk tidak ditemukan.',
            ], 404);
        }

        $product->load(['testimonials' => function ($query): void {
            $query
                ->where('is_published', true)
                ->whereNotNull('order_id')
                ->latest();
        }]);

        return response()->json([
            'data' => $this->productPayload($product),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateProduct($request);
        $validated['image'] = $this->resolveImagePath($request);
        $product = Product::query()->create($validated);
        $this->notifications->lowStock($product);

        return response()->json([
            'message' => 'Produk berhasil ditambahkan.',
            'data' => $product,
        ], 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $validated = $this->validateProduct($request);
        $currentImage = $product->image;
        $validated['image'] = $this->resolveImagePath($request, $product);
        $product->update($validated);
        $this->deleteUploadedImageIfNeeded($currentImage, $product->image);
        $freshProduct = $product->fresh();
        $this->notifications->lowStock($freshProduct);

        return response()->json([
            'message' => 'Produk berhasil diperbarui.',
            'data' => $freshProduct,
        ]);
    }

    public function destroy(Product $product): JsonResponse
    {
        try {
            if ($product->status !== Product::STATUS_ARCHIVED) {
                $product->update([
                    'status' => Product::STATUS_ARCHIVED,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Produk berhasil diarsipkan. Produk tidak tampil di katalog customer, tetapi histori order tetap aman.',
                'data' => $product->fresh(),
            ]);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'success' => false,
                'message' => 'Produk gagal diarsipkan. Silakan coba lagi.',
            ], 500);
        }
    }

    private function validateProduct(Request $request): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'price' => ['required', 'integer', 'min:0'],
            'image' => ['nullable', 'string', 'max:255'],
            'image_file' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'category' => ['required', 'string', 'max:255'],
            'spicy_level' => ['required', 'integer', 'between:1,5'],
            'weight' => ['required', 'string', 'max:50'],
            'stock' => ['required', 'integer', 'min:0'],
            'status' => ['nullable', Rule::in(Product::STATUSES)],
        ]);

        unset($validated['image_file']);
        $validated['status'] = $validated['status'] ?? Product::STATUS_ACTIVE;

        return $validated;
    }

    private function categoriesFor($query): array
    {
        return array_values(array_unique(array_merge(
            ['Semua'],
            (clone $query)->orderBy('category')->pluck('category')->all()
        )));
    }

    private function withReviewSummary(Builder $query): Builder
    {
        return $query
            ->select('products.*')
            ->selectSub(function ($query): void {
                $query
                    ->from('testimonials')
                    ->selectRaw('COUNT(*)')
                    ->whereColumn('testimonials.product_id', 'products.id')
                    ->where('testimonials.is_published', true)
                    ->whereNotNull('testimonials.order_id');
            }, 'review_count')
            ->selectSub(function ($query): void {
                $query
                    ->from('testimonials')
                    ->selectRaw('AVG(testimonials.rating)')
                    ->whereColumn('testimonials.product_id', 'products.id')
                    ->where('testimonials.is_published', true)
                    ->whereNotNull('testimonials.order_id');
            }, 'average_rating');
    }

    private function productPayload(Product $product): array
    {
        $data = $product->toArray();
        $reviewCount = (int) ($product->review_count
            ?? ($product->relationLoaded('testimonials') ? $product->testimonials->count() : 0));
        $averageRating = $product->average_rating
            ?? ($product->relationLoaded('testimonials') && $reviewCount > 0 ? $product->testimonials->avg('rating') : null);

        unset($data['review_count'], $data['average_rating']);

        $data['review_summary'] = [
            'count' => $reviewCount,
            'average_rating' => $reviewCount > 0 && $averageRating !== null ? round((float) $averageRating, 1) : null,
        ];

        return $data;
    }

    private function resolveImagePath(Request $request, ?Product $product = null): string
    {
        if ($request->hasFile('image_file')) {
            return $this->storeUploadedImage($request->file('image_file'));
        }

        $manualImage = trim((string) $request->input('image', ''));

        if ($manualImage !== '') {
            return preg_match('/^https?:\/\//', $manualImage)
                ? $manualImage
                : ltrim($manualImage, '/');
        }

        if ($product) {
            return $product->image;
        }

        throw ValidationException::withMessages([
            'image_file' => ['Foto produk wajib diunggah atau isi path gambar.'],
        ]);
    }

    private function storeUploadedImage(UploadedFile $uploadedFile): string
    {
        $directory = public_path('uploads/products');

        if (! File::isDirectory($directory)) {
            File::makeDirectory($directory, 0755, true);
        }

        $extension = $uploadedFile->getClientOriginalExtension()
            ?: $uploadedFile->extension()
            ?: 'jpg';
        $filename = now()->format('YmdHis') . '-' . Str::lower(Str::random(12)) . '.' . $extension;

        $uploadedFile->move($directory, $filename);

        return "uploads/products/{$filename}";
    }

    private function deleteUploadedImageIfNeeded(?string $previousImage, ?string $newImage = null): void
    {
        $normalizedPreviousImage = is_string($previousImage) ? ltrim($previousImage, '/') : null;
        $normalizedNewImage = is_string($newImage) ? ltrim($newImage, '/') : null;

        if (! $normalizedPreviousImage || $normalizedPreviousImage === $normalizedNewImage) {
            return;
        }

        if (! Str::startsWith($normalizedPreviousImage, 'uploads/products/')) {
            return;
        }

        $imagePath = public_path($normalizedPreviousImage);

        if (File::exists($imagePath)) {
            File::delete($imagePath);
        }
    }
}
