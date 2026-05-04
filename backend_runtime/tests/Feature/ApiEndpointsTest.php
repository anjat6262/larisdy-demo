<?php

namespace Tests\Feature;

use App\Mail\OrderPlacedMail;
use App\Mail\OrderStatusUpdatedMail;
use App\Mail\WelcomeToLarisdyMail;
use App\Models\Notification as AppNotification;
use App\Models\Order;
use App\Models\PaymentProof;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiEndpointsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'filesystems.disks.public.root' => storage_path('app/testing/public'),
        ]);
        app('filesystem')->forgetDisk('public');

        $this->seed(DatabaseSeeder::class);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory(storage_path('app/testing'));

        parent::tearDown();
    }

    public function test_register_creates_customer_role_by_default_and_sends_email(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/register', [
            'name' => 'User Baru',
            'email' => 'baru@example.com',
            'phone' => '0812-3333-4444',
            'address' => 'Jl. Baru No. 8, Surabaya',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('user.role', User::ROLE_CUSTOMER)
            ->assertJsonStructure([
                'message',
                'token',
                'user' => ['id', 'name', 'email', 'phone', 'address', 'role', 'created_at'],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'baru@example.com',
            'role' => User::ROLE_CUSTOMER,
        ]);

        Mail::assertSent(WelcomeToLarisdyMail::class);
    }

    public function test_login_and_authenticated_user_endpoints_return_role(): void
    {
        $loginResponse = $this->postJson('/api/login', $this->adminCredentials());

        $loginResponse
            ->assertOk()
            ->assertJsonPath('message', 'Login berhasil.')
            ->assertJsonPath('user.email', 'admin@larisdy.com')
            ->assertJsonPath('user.role', User::ROLE_ADMIN);

        $token = $loginResponse->json('token');

        $this->withToken($token)
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('data.email', 'admin@larisdy.com')
            ->assertJsonPath('data.role', User::ROLE_ADMIN);
    }

    public function test_products_and_business_profile_endpoints_return_seeded_content(): void
    {
        $this->getJson('/api/products')
            ->assertOk()
            ->assertJsonCount(4, 'data')
            ->assertJsonPath('meta.categories.0', 'Semua')
            ->assertJsonPath('data.0.review_summary.count', 0)
            ->assertJsonPath('data.0.review_summary.average_rating', null);

        $this->getJson('/api/business-profile')
            ->assertOk()
            ->assertJsonPath('data.company_name', 'Larisdy')
            ->assertJsonPath(
                'data.vision',
                'Menjadi brand sambal khas Indonesia yang terpercaya, modern, dan mampu menjangkau pasar nasional melalui platform digital.',
            )
            ->assertJsonPath('data.address', 'Sentra IKM Kakenturan 1, Kec. Maesa, Sulawesi Utara')
            ->assertJsonPath('data.missions.0', 'Menyediakan produk berkualitas dengan cita rasa autentik');
    }

    public function test_admin_can_create_update_and_delete_product(): void
    {
        $token = $this->loginAndGetToken($this->adminCredentials());

        $createResponse = $this->withToken($token)->postJson('/api/products', [
            'name' => 'Sambal Admin',
            'description' => 'Produk baru dari admin.',
            'price' => 55000,
            'image' => 'images/sambal-admin.jpeg',
            'category' => 'Sambal Premium',
            'spicy_level' => 5,
            'weight' => '200g',
            'stock' => 12,
        ]);

        $productId = $createResponse->json('data.id');

        $createResponse
            ->assertCreated()
            ->assertJsonPath('message', 'Produk berhasil ditambahkan.')
            ->assertJsonPath('data.name', 'Sambal Admin')
            ->assertJsonPath('data.status', Product::STATUS_ACTIVE);

        $this->withToken($token)->putJson("/api/products/{$productId}", [
            'name' => 'Sambal Admin Update',
            'description' => 'Produk admin telah diperbarui.',
            'price' => 60000,
            'image' => 'images/sambal-admin.jpeg',
            'category' => 'Sambal Premium',
            'spicy_level' => 4,
            'weight' => '210g',
            'stock' => 20,
            'status' => Product::STATUS_ACTIVE,
        ])
            ->assertOk()
            ->assertJsonPath('message', 'Produk berhasil diperbarui.')
            ->assertJsonPath('data.name', 'Sambal Admin Update')
            ->assertJsonPath('data.status', Product::STATUS_ACTIVE);

        $customer = User::query()->where('email', 'user@gmail.com')->firstOrFail();
        $order = $this->createReportOrder(
            user: $customer,
            product: Product::query()->findOrFail($productId),
            quantity: 1,
            status: Order::STATUS_PENDING,
            paymentStatus: Order::PAYMENT_STATUS_PENDING,
            paidAt: now()->toDateTimeString(),
        );

        $this->withToken($token)
            ->deleteJson("/api/products/{$productId}")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Produk berhasil diarsipkan. Produk tidak tampil di katalog customer, tetapi histori order tetap aman.')
            ->assertJsonPath('data.status', Product::STATUS_ARCHIVED);

        $this->assertDatabaseHas('products', [
            'id' => $productId,
            'status' => Product::STATUS_ARCHIVED,
        ]);
        $this->assertDatabaseHas('order_items', [
            'order_id' => $order->id,
            'product_id' => $productId,
        ]);

        $products = $this->getJson('/api/products')
            ->assertOk()
            ->json('data');

        $this->assertFalse(collect($products)->contains('id', $productId));
    }

    public function test_public_products_only_show_active_products(): void
    {
        Product::query()->whereKey(1)->update(['status' => Product::STATUS_INACTIVE]);
        Product::query()->whereKey(2)->update(['status' => Product::STATUS_ARCHIVED]);

        $products = $this->getJson('/api/products')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->json('data');

        $this->assertFalse(collect($products)->contains('status', Product::STATUS_INACTIVE));
        $this->assertFalse(collect($products)->contains('status', Product::STATUS_ARCHIVED));

        $customer = User::query()->where('email', 'user@gmail.com')->firstOrFail();
        Sanctum::actingAs($customer);

        $this->postJson('/api/checkout', $this->checkoutPayload(productId: 2))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('items')
            ->assertJsonPath('errors.items.0', 'Produk yang dipilih tidak tersedia.');

        $admin = User::query()->where('email', 'admin@larisdy.com')->firstOrFail();
        Sanctum::actingAs($admin);

        $adminProducts = $this->getJson('/api/admin/products')
            ->assertOk()
            ->json('data');

        $this->assertTrue(collect($adminProducts)->contains('status', Product::STATUS_INACTIVE));
        $this->assertFalse(collect($adminProducts)->contains('status', Product::STATUS_ARCHIVED));
    }

    public function test_admin_can_upload_product_image(): void
    {
        $token = $this->loginAndGetToken($this->adminCredentials());
        $image = $this->fakePngUpload('produk-baru.png');

        $response = $this->withToken($token)->post('/api/products', [
            'name' => 'Produk Dengan Foto',
            'description' => 'Produk dengan foto hasil upload admin.',
            'price' => 47000,
            'category' => 'Sambal Premium',
            'spicy_level' => 4,
            'weight' => '190g',
            'stock' => 7,
            'image_file' => $image,
        ], [
            'Accept' => 'application/json',
        ]);

        $storedPath = $response
            ->assertCreated()
            ->json('data.image');

        $this->assertNotNull($storedPath);
        $this->assertStringStartsWith('uploads/products/', $storedPath);
        $this->assertFileExists(public_path($storedPath));

        File::delete(public_path($storedPath));
    }

    public function test_customer_cannot_access_admin_product_routes(): void
    {
        $token = $this->loginAndGetToken($this->customerCredentials());
        $product = Product::query()->findOrFail(1);

        $payload = [
            'name' => 'Tidak Boleh',
            'description' => 'Customer tidak boleh membuat produk.',
            'price' => 10000,
            'image' => 'images/tidak-boleh.jpeg',
            'category' => 'Snack',
            'spicy_level' => 2,
            'weight' => '100g',
            'stock' => 5,
        ];

        $this->withToken($token)
            ->postJson('/api/products', $payload)
            ->assertForbidden()
            ->assertJsonPath('message', 'Akses ditolak untuk role Anda.');

        $this->withToken($token)
            ->getJson('/api/admin/products')
            ->assertForbidden()
            ->assertJsonPath('message', 'Akses ditolak untuk role Anda.');

        $this->withToken($token)
            ->putJson("/api/products/{$product->id}", $payload)
            ->assertForbidden();

        $this->withToken($token)
            ->deleteJson("/api/products/{$product->id}")
            ->assertForbidden();
    }

    public function test_customer_checkout_creates_pending_order_and_sends_email(): void
    {
        Mail::fake();

        $customer = User::query()->where('email', 'user@gmail.com')->firstOrFail();
        Sanctum::actingAs($customer);
        $product = Product::query()->findOrFail(1);
        $initialStock = $product->stock;

        $checkoutResponse = $this->postJson('/api/checkout', $this->checkoutPayload(
            productId: $product->id,
            quantity: 2,
            overrides: [
                'shipping_courier' => Order::SHIPPING_COURIER_JNT,
                'shipping_latitude' => -6.917464,
                'shipping_longitude' => 107.619123,
            ],
        ));

        $checkoutResponse
            ->assertCreated()
            ->assertJsonPath('message', 'Checkout berhasil.')
            ->assertJsonPath('data.customer_email', 'user@gmail.com')
            ->assertJsonPath('data.status', Order::STATUS_PENDING)
            ->assertJsonPath('data.payment_method', 'qris_manual')
            ->assertJsonPath('data.payment_provider', null)
            ->assertJsonPath('data.shipping_courier', Order::SHIPPING_COURIER_JNT)
            ->assertJsonPath('data.shipping_latitude', -6.917464)
            ->assertJsonPath('data.shipping_longitude', 107.619123)
            ->assertJsonPath('data.payment_payload.qris_image', 'images/qris.jpeg')
            ->assertJsonStructure(['data' => ['payment_expires_at']]);

        $this->getJson('/api/orders')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.customer_email', 'user@gmail.com')
            ->assertJsonPath('data.0.shipping_courier', Order::SHIPPING_COURIER_JNT)
            ->assertJsonPath('data.0.shipping_latitude', -6.917464)
            ->assertJsonPath('data.0.shipping_longitude', 107.619123)
            ->assertJsonPath('data.0.items.0.quantity', 2)
            ->assertJsonPath('data.0.status', Order::STATUS_PENDING)
            ->assertJsonPath('data.0.payment_deadline_passed', false)
            ->assertJsonStructure(['data' => [['payment_deadline_seconds_remaining']]]);

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'stock' => $initialStock,
        ]);
        $this->assertDatabaseHas('orders', [
            'customer_email' => 'user@gmail.com',
            'shipping_courier' => Order::SHIPPING_COURIER_JNT,
        ]);

        Mail::assertSent(OrderPlacedMail::class);
    }

    public function test_checkout_rejects_unsupported_shipping_courier(): void
    {
        $customer = User::query()->where('email', 'user@gmail.com')->firstOrFail();
        Sanctum::actingAs($customer);

        $this->postJson('/api/checkout', $this->checkoutPayload(
            productId: 1,
            overrides: ['shipping_courier' => 'pickup'],
        ))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('shipping_courier')
            ->assertJsonPath('errors.shipping_courier.0', 'Kurir pengiriman hanya tersedia JNE atau J&T.');
    }

    public function test_notifications_are_scoped_and_can_be_marked_read(): void
    {
        Mail::fake();

        $customer = User::query()->where('email', 'user@gmail.com')->firstOrFail();
        Sanctum::actingAs($customer);

        $order = $this->postJson('/api/checkout', $this->checkoutPayload(productId: 1))
            ->assertCreated()
            ->json('data');

        $customerNotifications = $this->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('meta.unread_count', 2)
            ->json('data');

        $this->assertCount(2, $customerNotifications);
        $this->assertEqualsCanonicalizing(
            ['order_created', 'payment_pending'],
            collect($customerNotifications)->pluck('type')->all(),
        );

        $adminNotification = AppNotification::query()
            ->where('type', 'admin_order_created')
            ->firstOrFail();

        $this->postJson("/api/notifications/{$adminNotification->id}/read")
            ->assertNotFound();

        $this->postJson("/api/notifications/{$customerNotifications[0]['id']}/read")
            ->assertOk()
            ->assertJsonStructure(['data' => ['read_at']]);

        $this->getJson('/api/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('data.unread_count', 1);

        $this->postJson('/api/notifications/read-all')
            ->assertOk()
            ->assertJsonPath('data.unread_count', 0);

        $admin = User::query()->where('email', 'admin@larisdy.com')->firstOrFail();
        Sanctum::actingAs($admin);

        $this->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('data.0.type', 'admin_order_created')
            ->assertJsonPath('data.0.reference_id', $order['id']);
    }

    public function test_qris_checkout_uses_qris_instruction_when_selected(): void
    {
        Mail::fake();

        $customer = User::query()->where('email', 'user@gmail.com')->firstOrFail();
        Sanctum::actingAs($customer);

        $this->postJson('/api/checkout', $this->checkoutPayload(
            productId: 1,
            overrides: ['payment_method' => 'qris_manual'],
        ))
            ->assertCreated()
            ->assertJsonPath('data.payment_method', 'qris_manual')
            ->assertJsonPath('data.payment_payload.qris_image', 'images/qris.jpeg');
    }

    public function test_checkout_rejects_unsupported_payment_methods(): void
    {
        $customer = User::query()->where('email', 'user@gmail.com')->firstOrFail();
        Sanctum::actingAs($customer);

        foreach (['midtrans', 'transfer', 'cod', 'bank_transfer', 'virtual_account'] as $paymentMethod) {
            $this->postJson('/api/checkout', $this->checkoutPayload(
                productId: 1,
                overrides: ['payment_method' => $paymentMethod],
            ))
                ->assertUnprocessable()
                ->assertJsonValidationErrors('payment_method')
                ->assertJsonPath('errors.payment_method.0', 'Metode pembayaran hanya tersedia QRIS pribadi atau transfer rekening BCA.');
        }
    }

    public function test_customer_checkout_can_use_manual_bca_bank_transfer_payment(): void
    {
        config([
            'payment.manual_bank_accounts.bca.account_number' => '1234567890',
            'payment.manual_bank_accounts.bca.account_name' => 'Larisdy Test',
        ]);
        Mail::fake();

        $customer = User::query()->where('email', 'user@gmail.com')->firstOrFail();
        Sanctum::actingAs($customer);

        $checkoutResponse = $this->postJson('/api/checkout', $this->checkoutPayload(
            productId: 1,
            overrides: [
                'payment_method' => 'bank_transfer_bca',
            ],
        ));

        $order = $checkoutResponse
            ->assertCreated()
            ->assertJsonPath('data.payment_method', 'bank_transfer_bca')
            ->assertJsonPath('data.payment_provider', null)
            ->assertJsonPath('data.payment_payload.bank_name', 'BCA')
            ->assertJsonPath('data.payment_payload.account_number', '1234567890')
            ->assertJsonPath('data.payment_payload.account_name', 'Larisdy Test')
            ->assertJsonPath('data.payment_payload.payment_name', 'Transfer Bank BCA')
            ->json('data');

        $this->postJson('/api/payment', [
            'order_id' => $order['id'],
        ])
            ->assertOk()
            ->assertJsonPath('message', 'Instruksi pembayaran Transfer BCA tersedia.')
            ->assertJsonPath('data.provider', null)
            ->assertJsonPath('data.order.payment_method', 'bank_transfer_bca')
            ->assertJsonPath('data.order.payment_payload.account_number', '1234567890');

        $uploadResponse = $this->post("/api/orders/{$order['id']}/payment-proof", [
            'proof' => $this->fakePngUpload('bukti-transfer-bca.png'),
            'note' => 'Sudah transfer ke rekening BCA.',
        ], [
            'Accept' => 'application/json',
        ]);

        $uploadResponse
            ->assertCreated()
            ->assertJsonPath('data.payment_proof.verification_status', PaymentProof::STATUS_PENDING);

        $admin = User::query()->where('email', 'admin@larisdy.com')->firstOrFail();
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/orders/{$order['id']}/payment-proof/verify")
            ->assertOk()
            ->assertJsonPath('data.status', Order::STATUS_PAID)
            ->assertJsonPath('data.payment_status', Order::PAYMENT_STATUS_PAID)
            ->assertJsonPath('data.payment_proof.verification_status', PaymentProof::STATUS_VERIFIED);

        Mail::assertSent(OrderPlacedMail::class);
    }

    public function test_qris_checkout_stores_instruction_payload(): void
    {
        Mail::fake();

        $customer = User::query()->where('email', 'user@gmail.com')->firstOrFail();
        Sanctum::actingAs($customer);

        $checkoutResponse = $this->postJson('/api/checkout', $this->checkoutPayload(
            productId: 1,
        ));

        $orderId = $checkoutResponse
            ->assertCreated()
            ->assertJsonPath('data.payment_method', 'qris_manual')
            ->assertJsonPath('data.payment_payload.qris_image', 'images/qris.jpeg')
            ->assertJsonPath('data.payment_payload.payment_name', 'QRIS Larisdy')
            ->json('data.id');

        $order = Order::query()->findOrFail($orderId);

        $this->assertSame('images/qris.jpeg', $order->payment_payload['qris_image']);
    }

    public function test_qris_payment_endpoint_returns_existing_instruction(): void
    {
        Mail::fake();

        $customer = User::query()->where('email', 'user@gmail.com')->firstOrFail();
        Sanctum::actingAs($customer);
        $product = Product::query()->findOrFail(1);
        $initialStock = $product->stock;

        $order = $this->postJson('/api/checkout', $this->checkoutPayload(
            productId: $product->id,
        ))
            ->assertCreated()
            ->json('data');

        $this->postJson('/api/payment', [
            'order_id' => $order['id'],
        ])
            ->assertOk()
            ->assertJsonPath('message', 'Instruksi pembayaran QRIS tersedia.')
            ->assertJsonPath('data.provider', null)
            ->assertJsonPath('data.token', null)
            ->assertJsonPath('data.payment_url', null)
            ->assertJsonPath('data.order.payment_status', Order::PAYMENT_STATUS_PENDING)
            ->assertJsonPath('data.order.payment_payload.qris_image', 'images/qris.jpeg');

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'stock' => $initialStock,
        ]);
    }

    public function test_qris_status_check_does_not_mark_order_paid(): void
    {
        Mail::fake();

        $customer = User::query()->where('email', 'user@gmail.com')->firstOrFail();
        Sanctum::actingAs($customer);
        $product = Product::query()->findOrFail(1);
        $initialStock = $product->stock;

        $order = $this->postJson('/api/checkout', $this->checkoutPayload(
            productId: $product->id,
        ))
            ->assertCreated()
            ->json('data');

        $this->postJson('/api/payment/status', [
            'order_id' => $order['id'],
        ])
            ->assertOk()
            ->assertJsonPath('message', 'Status pembayaran menunggu upload bukti dan verifikasi admin.')
            ->assertJsonPath('data.status', Order::STATUS_PENDING)
            ->assertJsonPath('data.payment_status', Order::PAYMENT_STATUS_PENDING);

        $this->assertDatabaseHas('orders', [
            'id' => $order['id'],
            'status' => Order::STATUS_PENDING,
            'payment_status' => Order::PAYMENT_STATUS_PENDING,
        ]);
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'stock' => $initialStock,
        ]);
    }

    public function test_pending_qris_order_expires_after_24_hours(): void
    {
        Mail::fake();

        $customer = User::query()->where('email', 'user@gmail.com')->firstOrFail();
        Sanctum::actingAs($customer);

        $order = $this->postJson('/api/checkout', $this->checkoutPayload(productId: 1))
            ->assertCreated()
            ->json('data');

        Order::query()->whereKey($order['id'])->update([
            'payment_expires_at' => now()->subMinute(),
        ]);

        $this->postJson('/api/payment/status', [
            'order_id' => $order['id'],
        ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Batas pembayaran 24 jam sudah lewat. Pesanan dibatalkan otomatis.')
            ->assertJsonPath('data.status', Order::STATUS_CANCELLED)
            ->assertJsonPath('data.payment_status', Order::PAYMENT_STATUS_EXPIRED);

        $this->post('/api/orders/' . $order['id'] . '/payment-proof', [
            'proof' => $this->fakePngUpload('bukti-expired.png'),
        ], [
            'Accept' => 'application/json',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Batas pembayaran 24 jam sudah lewat. Pesanan dibatalkan otomatis.');
    }

    public function test_admin_cannot_mark_manual_payment_paid_without_uploaded_proof(): void
    {
        Mail::fake();

        $customer = User::query()->where('email', 'user@gmail.com')->firstOrFail();
        Sanctum::actingAs($customer);
        $product = Product::query()->findOrFail(1);
        $initialStock = $product->stock;

        $order = $this->postJson('/api/checkout', $this->checkoutPayload(
            productId: $product->id,
        ))
            ->assertCreated()
            ->json('data');

        $admin = User::query()->where('email', 'admin@larisdy.com')->firstOrFail();
        Sanctum::actingAs($admin);

        $this->putJson("/api/admin/orders/{$order['id']}", ['status' => 'paid'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Customer harus upload bukti pembayaran terlebih dahulu.');

        $this->assertDatabaseHas('orders', [
            'id' => $order['id'],
            'status' => Order::STATUS_PENDING,
            'payment_status' => Order::PAYMENT_STATUS_PENDING,
        ]);

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'stock' => $initialStock,
        ]);

        Mail::assertSent(OrderPlacedMail::class);
    }

    public function test_customer_can_upload_payment_proof_and_admin_can_verify_it(): void
    {
        Mail::fake();

        $customer = User::query()->where('email', 'user@gmail.com')->firstOrFail();
        Sanctum::actingAs($customer);
        $product = Product::query()->findOrFail(1);
        $initialStock = $product->stock;

        $order = $this->postJson('/api/checkout', $this->checkoutPayload(
            productId: $product->id,
        ))
            ->assertCreated()
            ->json('data');

        $uploadResponse = $this->post("/api/orders/{$order['id']}/payment-proof", [
            'proof' => $this->fakePngUpload('bukti-bayar.png'),
            'note' => 'Sudah bayar lewat QRIS.',
        ], [
            'Accept' => 'application/json',
        ]);

        $proofPath = $uploadResponse
            ->assertCreated()
            ->assertJsonPath('data.payment_proof.verification_status', PaymentProof::STATUS_PENDING)
            ->assertJsonPath('data.payment_proof.note', 'Sudah bayar lewat QRIS.')
            ->json('data.payment_proof.file_path');

        $this->assertFileExists(Storage::disk('public')->path($proofPath));
        $this->assertDatabaseHas('payment_proofs', [
            'order_id' => $order['id'],
            'user_id' => $customer->id,
            'note' => 'Sudah bayar lewat QRIS.',
            'verification_status' => PaymentProof::STATUS_PENDING,
        ]);

        $this->post("/api/orders/{$order['id']}/payment-proof", [
            'proof' => $this->fakePngUpload('bukti-duplikat.png'),
        ], [
            'Accept' => 'application/json',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Bukti pembayaran sudah terkirim dan sedang menunggu verifikasi admin.');

        $admin = User::query()->where('email', 'admin@larisdy.com')->firstOrFail();
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/orders/{$order['id']}/payment-proof/verify")
            ->assertOk()
            ->assertJsonPath('data.status', Order::STATUS_PAID)
            ->assertJsonPath('data.payment_status', Order::PAYMENT_STATUS_PAID)
            ->assertJsonPath('data.payment_proof.verification_status', PaymentProof::STATUS_VERIFIED);

        $this->assertDatabaseHas('payment_proofs', [
            'order_id' => $order['id'],
            'verification_status' => PaymentProof::STATUS_VERIFIED,
            'verified_by' => $admin->id,
        ]);
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'stock' => $initialStock - 1,
        ]);

        Mail::assertSent(OrderStatusUpdatedMail::class);
    }

    public function test_admin_can_reject_payment_proof_and_customer_can_resubmit(): void
    {
        $customer = User::query()->where('email', 'user@gmail.com')->firstOrFail();
        Sanctum::actingAs($customer);

        $order = $this->postJson('/api/checkout', $this->checkoutPayload(productId: 1))
            ->assertCreated()
            ->json('data');

        $this->post("/api/orders/{$order['id']}/payment-proof", [
            'proof' => $this->fakePngUpload('bukti-ditolak.png'),
        ], [
            'Accept' => 'application/json',
        ])->assertCreated();

        $admin = User::query()->where('email', 'admin@larisdy.com')->firstOrFail();
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/orders/{$order['id']}/payment-proof/reject", [
            'rejection_note' => 'Nominal belum sesuai.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', Order::STATUS_PENDING)
            ->assertJsonPath('data.payment_status', Order::PAYMENT_STATUS_PENDING)
            ->assertJsonPath('data.payment_proof.verification_status', PaymentProof::STATUS_REJECTED)
            ->assertJsonPath('data.payment_proof.rejection_note', 'Nominal belum sesuai.');

        $this->putJson("/api/admin/orders/{$order['id']}", ['status' => 'paid'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Bukti pembayaran terakhir sudah ditolak. Tunggu customer mengirim bukti baru sebelum verifikasi.');

        Sanctum::actingAs($customer);

        $this->post("/api/orders/{$order['id']}/payment-proof", [
            'proof' => $this->fakePngUpload('bukti-baru.png'),
        ], [
            'Accept' => 'application/json',
        ])
            ->assertCreated()
            ->assertJsonPath('data.payment_proof.verification_status', PaymentProof::STATUS_PENDING);
    }

    public function test_qris_callback_endpoint_does_not_mark_order_paid(): void
    {
        Mail::fake();

        $customer = User::query()->where('email', 'user@gmail.com')->firstOrFail();
        Sanctum::actingAs($customer);
        $product = Product::query()->findOrFail(1);
        $initialStock = $product->stock;

        $order = $this->postJson('/api/checkout', $this->checkoutPayload(
            productId: $product->id,
            quantity: 2,
        ))
            ->assertCreated()
            ->json('data');

        $this->postJson('/api/payment/callback', [
            'provider' => 'manual',
            'order_id' => $order['code'],
            'transaction_id' => 'QRIS-' . $order['code'],
            'transaction_status' => 'settlement',
            'status_code' => '200',
            'gross_amount' => number_format((float) $order['grand_total'], 2, '.', ''),
        ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Pembayaran manual diverifikasi oleh admin.');

        $this->assertDatabaseHas('orders', [
            'id' => $order['id'],
            'status' => Order::STATUS_PENDING,
            'payment_status' => Order::PAYMENT_STATUS_PENDING,
        ]);
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'stock' => $initialStock,
        ]);
    }

    public function test_admin_can_view_all_orders_and_process_order_with_tracking_number(): void
    {
        Mail::fake();

        $customer = User::query()->where('email', 'user@gmail.com')->firstOrFail();
        $createdOrder = $this->createOrderForCustomer($customer, 1);
        Order::query()->whereKey($createdOrder['id'])->update([
            'status' => Order::STATUS_PAID,
            'payment_status' => Order::PAYMENT_STATUS_PAID,
            'status_updated_at' => now(),
        ]);

        $admin = User::query()->where('email', 'admin@larisdy.com')->firstOrFail();
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/orders')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $createdOrder['id'])
            ->assertJsonPath('meta.summary.total_orders', 1);

        $this->putJson("/api/admin/orders/{$createdOrder['id']}", ['status' => 'diproses'])
            ->assertOk()
            ->assertJsonPath('data.status', Order::STATUS_PROCESSED);

        $this->putJson("/api/admin/orders/{$createdOrder['id']}", [
            'status' => 'dikirim',
            'tracking_number' => 'JNE-123456789',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', Order::STATUS_SHIPPED)
            ->assertJsonPath('data.tracking_number', 'JNE-123456789');

        $this->putJson("/api/admin/orders/{$createdOrder['id']}", ['status' => 'selesai'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Admin tidak bisa menyelesaikan pesanan. Konfirmasi selesai hanya dapat dilakukan oleh customer.');

        Sanctum::actingAs($customer);

        $this->postJson("/api/orders/{$createdOrder['id']}/complete")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Pesanan telah diselesaikan')
            ->assertJsonPath('data.status', Order::STATUS_COMPLETED);

        $this->assertDatabaseHas('orders', [
            'id' => $createdOrder['id'],
            'status' => Order::STATUS_COMPLETED,
            'tracking_number' => 'JNE-123456789',
        ]);

        Mail::assertSent(OrderStatusUpdatedMail::class);
    }

    public function test_customer_order_tracking_uses_authenticated_customer_orders(): void
    {
        Mail::fake();

        $customer = User::query()->where('email', 'user@gmail.com')->firstOrFail();
        $otherCustomer = $this->createCustomer('customer-track-other@example.com');
        $createdOrder = $this->createOrderForCustomer($customer, 1);
        $otherOrder = $this->createOrderForCustomer($otherCustomer, 2);

        Order::query()->whereKey($createdOrder['id'])->update([
            'status' => Order::STATUS_SHIPPED,
            'payment_status' => Order::PAYMENT_STATUS_PAID,
            'tracking_number' => 'JNE-TRACK-001',
            'status_updated_at' => now(),
        ]);

        Order::query()->whereKey($otherOrder['id'])->update([
            'status' => Order::STATUS_SHIPPED,
            'payment_status' => Order::PAYMENT_STATUS_PAID,
            'tracking_number' => 'JNE-TRACK-OTHER',
            'status_updated_at' => now(),
        ]);

        Sanctum::actingAs($customer);

        $this->getJson('/api/orders')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $createdOrder['id'])
            ->assertJsonPath('data.0.code', $createdOrder['code'])
            ->assertJsonPath('data.0.tracking_number', 'JNE-TRACK-001')
            ->assertJsonPath('data.0.tracking_timeline.3.key', Order::STATUS_SHIPPED)
            ->assertJsonPath('data.0.tracking_timeline.3.is_current', true)
            ->assertJsonPath('data.0.items.0.product_id', '1');

        $this->getJson("/api/orders/{$createdOrder['id']}")
            ->assertOk()
            ->assertJsonPath('data.id', $createdOrder['id'])
            ->assertJsonPath('data.tracking_timeline.3.description', 'Pesanan sudah dikirim via JNE dengan resi JNE-TRACK-001.');

        $this->getJson("/api/orders/{$otherOrder['id']}")
            ->assertForbidden()
            ->assertJsonPath('message', 'Akses ditolak untuk pesanan ini.');
    }

    public function test_customer_complete_order_requires_owner_and_shipped_status(): void
    {
        $firstCustomer = User::query()->where('email', 'user@gmail.com')->firstOrFail();
        $secondCustomer = $this->createCustomer('customer-complete@example.com');

        $pendingOrder = $this->createOrderForCustomer($firstCustomer, 1);

        Sanctum::actingAs($firstCustomer);

        $this->postJson("/api/orders/{$pendingOrder['id']}/complete")
            ->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Pesanan hanya bisa diselesaikan setelah status dikirim.');

        Order::query()->whereKey($pendingOrder['id'])->update([
            'status' => Order::STATUS_SHIPPED,
            'tracking_number' => 'JNE-OWNER-001',
            'status_updated_at' => now(),
        ]);

        Sanctum::actingAs($secondCustomer);

        $this->postJson("/api/orders/{$pendingOrder['id']}/complete")
            ->assertForbidden()
            ->assertJsonPath('message', 'Akses ditolak untuk pesanan ini.');

        $this->assertDatabaseHas('orders', [
            'id' => $pendingOrder['id'],
            'status' => Order::STATUS_SHIPPED,
        ]);
    }

    public function test_admin_patch_order_status_cannot_bypass_qris_verification_endpoint(): void
    {
        $customer = User::query()->where('email', 'user@gmail.com')->firstOrFail();
        $createdOrder = $this->createOrderForCustomer($customer, 1);

        $admin = User::query()->where('email', 'admin@larisdy.com')->firstOrFail();
        Sanctum::actingAs($admin);

        $this->patchJson("/api/orders/{$createdOrder['id']}/status", ['status' => Order::STATUS_PAID])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Gunakan dashboard pesanan admin untuk verifikasi pembayaran manual.');

        Order::query()->whereKey($createdOrder['id'])->update([
            'status' => Order::STATUS_SHIPPED,
            'tracking_number' => 'JNE-PATCH-001',
        ]);

        $this->patchJson("/api/orders/{$createdOrder['id']}/status", ['status' => Order::STATUS_COMPLETED])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Admin tidak bisa menyelesaikan pesanan. Konfirmasi selesai hanya dapat dilakukan oleh customer.');
    }

    public function test_admin_sales_summary_counts_paid_orders_only_and_supports_filters(): void
    {
        $customer = User::query()->where('email', 'user@gmail.com')->firstOrFail();
        $admin = User::query()->where('email', 'admin@larisdy.com')->firstOrFail();
        $firstProduct = Product::query()->findOrFail(1);
        $secondProduct = Product::query()->findOrFail(2);

        $this->createReportOrder(
            user: $customer,
            product: $firstProduct,
            quantity: 2,
            status: Order::STATUS_PAID,
            paymentStatus: Order::PAYMENT_STATUS_PAID,
            paidAt: '2026-04-10 10:00:00',
        );
        $this->createReportOrder(
            user: $customer,
            product: $secondProduct,
            quantity: 3,
            status: Order::STATUS_COMPLETED,
            paymentStatus: 'settlement',
            paidAt: '2026-04-20 10:00:00',
        );
        $this->createReportOrder(
            user: $customer,
            product: $firstProduct,
            quantity: 7,
            status: Order::STATUS_PENDING,
            paymentStatus: Order::PAYMENT_STATUS_PENDING,
            paidAt: '2026-04-12 10:00:00',
        );
        $this->createReportOrder(
            user: $customer,
            product: $firstProduct,
            quantity: 5,
            status: Order::STATUS_CANCELLED,
            paymentStatus: Order::PAYMENT_STATUS_EXPIRED,
            paidAt: '2026-04-18 10:00:00',
        );

        Sanctum::actingAs($admin);

        $expectedRevenue = ($firstProduct->price * 2) + ($secondProduct->price * 3);

        $this->getJson('/api/admin/reports/sales-summary?date_from=2026-04-01&date_to=2026-04-30')
            ->assertOk()
            ->assertJsonPath('total_products_sold', 5)
            ->assertJsonPath('total_revenue', $expectedRevenue)
            ->assertJsonPath('total_orders_paid', 2)
            ->assertJsonCount(2, 'products_sold')
            ->assertJsonPath('products_sold.0.product_id', $secondProduct->id)
            ->assertJsonPath('products_sold.0.product_name', $secondProduct->name)
            ->assertJsonPath('products_sold.0.total_quantity', 3)
            ->assertJsonPath('products_sold.0.total_revenue', $secondProduct->price * 3)
            ->assertJsonPath('products_sold.0.order_count', 1)
            ->assertJsonPath('products_sold.1.product_id', $firstProduct->id)
            ->assertJsonPath('products_sold.1.total_quantity', 2);

        $this->getJson("/api/admin/reports/sales-summary?product_id={$firstProduct->id}")
            ->assertOk()
            ->assertJsonPath('total_products_sold', 2)
            ->assertJsonPath('total_revenue', $firstProduct->price * 2)
            ->assertJsonPath('total_orders_paid', 1)
            ->assertJsonCount(1, 'products_sold')
            ->assertJsonPath('products_sold.0.product_id', $firstProduct->id)
            ->assertJsonPath('products_sold.0.total_quantity', 2);

        $this->getJson('/api/admin/reports/sales-summary?date_from=2026-04-15&date_to=2026-04-30')
            ->assertOk()
            ->assertJsonPath('total_products_sold', 3)
            ->assertJsonPath('total_revenue', $secondProduct->price * 3)
            ->assertJsonPath('total_orders_paid', 1)
            ->assertJsonCount(1, 'products_sold')
            ->assertJsonPath('products_sold.0.product_id', $secondProduct->id);
    }

    public function test_customer_cannot_access_admin_order_routes_or_other_customer_order(): void
    {
        $firstCustomer = User::query()->where('email', 'user@gmail.com')->firstOrFail();
        $firstOrder = $this->createOrderForCustomer($firstCustomer, 1);

        $secondCustomer = $this->createCustomer('customer3@example.com');
        $secondOrder = $this->createOrderForCustomer($secondCustomer, 2, 1, [
            'customer_name' => 'Customer Kedua',
            'customer_email' => 'customer3@example.com',
            'customer_phone' => '0812-3333-0003',
        ]);

        Sanctum::actingAs($firstCustomer);

        $this->getJson("/api/orders/{$secondOrder['id']}")
            ->assertForbidden()
            ->assertJsonPath('message', 'Akses ditolak untuk pesanan ini.');

        $this->getJson('/api/admin/orders')
            ->assertForbidden()
            ->assertJsonPath('message', 'Akses ditolak untuk role Anda.');

        $this->getJson('/api/admin/reports/sales-summary')
            ->assertForbidden()
            ->assertJsonPath('message', 'Akses ditolak untuk role Anda.');

        $this->putJson("/api/admin/orders/{$firstOrder['id']}", ['status' => 'paid'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Akses ditolak untuk role Anda.');
    }

    public function test_testimonial_and_contact_endpoints_store_data(): void
    {
        $this->getJson('/api/testimonials')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        $customerWithoutCompletedOrder = $this->createCustomer('pelangganbaru@example.com', [
            'name' => 'Pelanggan Baru',
        ]);

        Sanctum::actingAs($customerWithoutCompletedOrder);

        $this->getJson('/api/testimonials/eligibility?product_id=1')
            ->assertOk()
            ->assertJsonPath('data.can_submit', false)
            ->assertJsonPath('data.message', 'Anda harus menyelesaikan pesanan produk ini sebelum memberikan review.');

        $this->postJson('/api/testimonials', [
            'product_id' => 1,
            'order_id' => 999,
            'city' => 'Medan',
            'rating' => 5,
            'message' => 'Produknya enak dan halaman pembayarannya sekarang sangat nyaman digunakan.',
        ])
            ->assertUnprocessable();

        $customerWithCompletedOrder = User::query()->where('email', 'user@gmail.com')->firstOrFail();
        $completedOrder = $this->createOrderForCustomer($customerWithCompletedOrder, 1, 1, [
            'customer_name' => $customerWithCompletedOrder->name,
            'customer_email' => $customerWithCompletedOrder->email,
            'customer_phone' => $customerWithCompletedOrder->phone,
        ]);

        Order::query()->whereKey($completedOrder['id'])->update([
            'status' => Order::STATUS_COMPLETED,
            'status_updated_at' => now(),
        ]);

        Sanctum::actingAs($customerWithCompletedOrder);

        $this->getJson('/api/products/1')
            ->assertOk()
            ->assertJsonPath('data.review_summary.count', 0)
            ->assertJsonPath('data.review_summary.average_rating', null);

        $this->getJson('/api/testimonials/eligibility?product_id=1')
            ->assertOk()
            ->assertJsonPath('data.can_submit', true)
            ->assertJsonPath('data.eligible_order_id', $completedOrder['id']);

        $image = $this->fakePngUpload('testimonial-upload.png');

        $testimonialWithImageResponse = $this->post('/api/testimonials', [
            'product_id' => 1,
            'order_id' => $completedOrder['id'],
            'city' => 'Yogyakarta',
            'rating' => 4,
            'message' => 'Saya upload foto dan testimoni ini harus tampil lengkap di UI.',
            'image' => $image,
        ], [
            'Accept' => 'application/json',
        ]);

        $imagePath = $testimonialWithImageResponse
            ->assertCreated()
            ->json('data.image');

        $imageUrl = $testimonialWithImageResponse->json('data.image_url');

        $this->getJson('/api/products/1')
            ->assertOk()
            ->assertJsonPath('data.testimonials.0.product_id', '1')
            ->assertJsonPath('data.review_summary.count', 1)
            ->assertJsonPath('data.review_summary.average_rating', 4);

        $reviewedProducts = $this->getJson('/api/products')
            ->assertOk()
            ->json('data');
        $reviewedProduct = collect($reviewedProducts)->firstWhere('id', 1);

        $this->assertSame(1, $reviewedProduct['review_summary']['count']);
        $this->assertEquals(4.0, $reviewedProduct['review_summary']['average_rating']);

        $this->getJson('/api/testimonials/eligibility?product_id=1')
            ->assertOk()
            ->assertJsonPath('data.can_submit', false);

        $this->postJson('/api/contact', [
            'name' => 'Kontak Baru',
            'email' => 'kontak@example.com',
            'phone' => '0812-9999-8888',
            'message' => 'Halo admin, saya ingin tanya tentang pengiriman ke luar Jawa.',
        ])
            ->assertCreated()
            ->assertJsonPath('message', 'Pesan Anda berhasil dikirim.');

        $this->assertDatabaseHas('testimonials', [
            'email' => 'user@gmail.com',
            'product_id' => 1,
            'order_id' => $completedOrder['id'],
            'city' => 'Yogyakarta',
        ]);

        $this->assertDatabaseHas('contacts', [
            'email' => 'kontak@example.com',
        ]);

        $this->assertNotNull($imagePath);
        $this->assertStringStartsWith('testimonials/', $imagePath);
        $this->assertMatchesRegularExpression('/^https?:\/\/.+\/storage\/testimonials\//', $imageUrl);
        $this->assertStringContainsString('/storage/testimonials/', $imageUrl);
        $this->assertFileExists(Storage::disk('public')->path($imagePath));
    }

    public function test_profile_endpoint_updates_authenticated_user_and_keeps_role(): void
    {
        $token = $this->loginAndGetToken($this->customerCredentials());

        $response = $this->withToken($token)->putJson('/api/profile', [
            'name' => 'Customer Update',
            'phone' => '0812-1111-2222',
            'address' => 'Jl. Asia Afrika No. 45, Bandung',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Profil berhasil diperbarui.')
            ->assertJsonPath('user.name', 'Customer Update')
            ->assertJsonPath('user.role', User::ROLE_CUSTOMER);

        $this->assertDatabaseHas('users', [
            'email' => 'user@gmail.com',
            'name' => 'Customer Update',
            'role' => User::ROLE_CUSTOMER,
        ]);
    }

    private function adminCredentials(): array
    {
        return [
            'email' => 'admin@larisdy.com',
            'password' => 'password',
        ];
    }

    private function customerCredentials(): array
    {
        return [
            'email' => 'user@gmail.com',
            'password' => 'password',
        ];
    }

    private function loginAndGetToken(array $credentials): string
    {
        return $this->postJson('/api/login', $credentials)
            ->assertOk()
            ->json('token');
    }

    private function createCustomer(string $email, array $overrides = []): User
    {
        return User::query()->create(array_merge([
            'name' => 'Customer Tambahan',
            'email' => $email,
            'phone' => '0812-2222-3333',
            'address' => 'Jl. Tambahan No. 9, Semarang',
            'role' => User::ROLE_CUSTOMER,
            'password' => Hash::make('password'),
        ], $overrides));
    }

    private function createOrderForCustomer(
        User $user,
        int $productId,
        int $quantity = 1,
        array $overrides = [],
    ): array {
        Sanctum::actingAs($user);

        return $this->postJson('/api/checkout', $this->checkoutPayload($productId, $quantity, array_merge([
            'customer_name' => $user->name,
            'customer_email' => $user->email,
            'customer_phone' => $user->phone,
            'shipping_address' => $user->address,
        ], $overrides)))
            ->assertCreated()
            ->json('data');
    }

    private function checkoutPayload(
        int $productId,
        int $quantity = 1,
        array $overrides = [],
    ): array {
        return array_merge([
            'customer_name' => 'Customer Larisdy',
            'customer_email' => 'user@gmail.com',
            'customer_phone' => '0812-0000-0002',
            'shipping_address' => 'Jl. Pelanggan No. 2, Bandung',
            'shipping_courier' => Order::SHIPPING_COURIER_JNE,
            'notes' => 'Checkout customer',
            'payment_method' => 'qris_manual',
            'items' => [
                [
                    'product_id' => $productId,
                    'quantity' => $quantity,
                ],
            ],
        ], $overrides);
    }

    private function createReportOrder(
        User $user,
        Product $product,
        int $quantity,
        string $status,
        ?string $paymentStatus,
        string $paidAt,
    ): Order {
        $subtotal = $product->price * $quantity;

        $order = Order::query()->create([
            'user_id' => $user->id,
            'code' => 'REPORT-' . uniqid(),
            'customer_name' => $user->name,
            'customer_email' => $user->email,
            'customer_phone' => $user->phone,
            'shipping_address' => $user->address,
            'shipping_courier' => Order::SHIPPING_COURIER_JNE,
            'payment_method' => 'bank_transfer_bca',
            'payment_provider' => null,
            'payment_status' => $paymentStatus,
            'payment_paid_at' => $paidAt,
            'subtotal' => $subtotal,
            'shipping_cost' => 15000,
            'grand_total' => $subtotal + 15000,
            'status' => $status,
            'status_updated_at' => $paidAt,
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'quantity' => $quantity,
            'price' => $product->price,
            'line_total' => $subtotal,
        ]);

        return $order;
    }

    private function fakeMidtransStatus(array $order, string $transactionStatus, string $statusCode, array $overrides = []): void
    {
        Http::fake([
            'https://api.sandbox.midtrans.com/v2/' . urlencode($order['code']) . '/status' => Http::response(array_merge([
                'transaction_id' => 'MIDTRANS-' . $order['code'],
                'order_id' => $order['code'],
                'transaction_status' => $transactionStatus,
                'status_code' => $statusCode,
                'gross_amount' => number_format((float) $order['grand_total'], 2, '.', ''),
                'status_message' => 'Midtrans status test.',
            ], $overrides), 200),
        ]);
    }

    private function midtransCallbackPayload(array $order, string $statusCode): array
    {
        $grossAmount = number_format((float) $order['grand_total'], 2, '.', '');

        return [
            'order_id' => $order['code'],
            'transaction_id' => 'MIDTRANS-' . $order['code'],
            'transaction_status' => 'pending',
            'status_code' => $statusCode,
            'gross_amount' => $grossAmount,
            'signature_key' => hash(
                'sha512',
                $order['code'] . $statusCode . $grossAmount . (string) config('payment.midtrans.server_key'),
            ),
        ];
    }

    private function fakePngUpload(string $filename): UploadedFile
    {
        $tempPath = tempnam(sys_get_temp_dir(), 'larisdy-image-');
        $pngBinary = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn8nS8AAAAASUVORK5CYII=',
            true,
        );

        file_put_contents($tempPath, $pngBinary);

        return new UploadedFile(
            $tempPath,
            $filename,
            'image/png',
            null,
            true,
        );
    }
}
