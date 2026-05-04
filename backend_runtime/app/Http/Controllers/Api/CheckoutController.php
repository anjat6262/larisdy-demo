<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\OrderPlacedMail;
use App\Models\Order;
use App\Models\Product;
use App\Services\NotificationService;
use App\Support\SendsAppMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CheckoutController extends Controller
{
    use SendsAppMail;

    public function __construct(private NotificationService $notifications)
    {
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_email' => ['required', 'email', 'max:255'],
            'customer_phone' => ['required', 'string', 'max:50'],
            'shipping_address' => ['required', 'string'],
            'shipping_courier' => ['nullable', 'string', Rule::in(Order::SHIPPING_COURIERS)],
            'shipping_latitude' => ['nullable', 'required_with:shipping_longitude', 'numeric', 'between:-90,90'],
            'shipping_longitude' => ['nullable', 'required_with:shipping_latitude', 'numeric', 'between:-180,180'],
            'notes' => ['nullable', 'string'],
            'payment_method' => ['required', Rule::in(['qris_manual', 'bank_transfer_bca'])],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ], [
            'shipping_courier.in' => 'Kurir pengiriman hanya tersedia JNE atau J&T.',
            'payment_method.in' => 'Metode pembayaran hanya tersedia QRIS pribadi atau transfer rekening BCA.',
        ]);

        $order = DB::transaction(function () use ($request, $validated): Order {
            $items = collect($validated['items']);
            $products = Product::query()
                ->where('status', Product::STATUS_ACTIVE)
                ->whereIn('id', $items->pluck('product_id'))
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $subtotal = 0;

            foreach ($items as $line) {
                $product = $products->get($line['product_id']);

                if (! $product) {
                    throw ValidationException::withMessages([
                        'items' => ['Produk yang dipilih tidak tersedia.'],
                    ]);
                }

                if ($line['quantity'] > $product->stock) {
                    throw ValidationException::withMessages([
                        'items' => ["Stok {$product->name} tidak mencukupi."],
                    ]);
                }

                $subtotal += $product->price * $line['quantity'];
            }

            $shippingCost = 15000;
            $grandTotal = $subtotal + $shippingCost;

            $paymentPayload = $validated['payment_method'] === 'bank_transfer_bca'
                ? array_merge(config('payment.manual_bank_accounts.bca'), [
                    'payment_name' => 'Transfer Bank BCA',
                    'payment_note' => 'Transfer sesuai total pesanan dalam 24 jam, lalu upload bukti pembayaran untuk diverifikasi admin.',
                ])
                : [
                    'qris_image' => 'images/qris.jpeg',
                    'payment_name' => 'QRIS Larisdy',
                    'payment_note' => 'Bayar sesuai total pesanan dalam 24 jam, lalu upload bukti pembayaran untuk diverifikasi admin.',
                ];

            $order = Order::create([
                'user_id' => $request->user()->id,
                'code' => 'ORD-' . now()->format('YmdHis') . '-' . Str::upper(Str::random(4)),
                'customer_name' => $validated['customer_name'],
                'customer_email' => $validated['customer_email'],
                'customer_phone' => $validated['customer_phone'],
                'shipping_address' => $validated['shipping_address'],
                'shipping_courier' => $validated['shipping_courier'] ?? Order::SHIPPING_COURIER_JNE,
                'shipping_latitude' => $validated['shipping_latitude'] ?? null,
                'shipping_longitude' => $validated['shipping_longitude'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'payment_method' => $validated['payment_method'],
                'subtotal' => $subtotal,
                'shipping_cost' => $shippingCost,
                'grand_total' => $grandTotal,
                'status' => Order::STATUS_PENDING,
                'payment_provider' => null,
                'payment_status' => Order::PAYMENT_STATUS_PENDING,
                'payment_expires_at' => now()->addDay(),
                'payment_payload' => $paymentPayload,
                'status_updated_at' => now(),
            ]);

            foreach ($items as $line) {
                $product = $products->get($line['product_id']);

                $order->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $line['quantity'],
                    'price' => $product->price,
                    'line_total' => $product->price * $line['quantity'],
                ]);
            }

            return $order->load(['user', 'items.product']);
        });

        $this->sendMailSilently($order->customer_email, new OrderPlacedMail($order));
        $this->notifications->orderCreated($order);

        return response()->json([
            'message' => 'Checkout berhasil.',
            'data' => $order,
        ], 201);
    }
}
