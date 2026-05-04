<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminOrderController;
use App\Http\Controllers\Api\AdminSalesReportController;
use App\Http\Controllers\Api\BusinessProfileController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\TestimonialController;
use Illuminate\Support\Facades\Route;

Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{product}', [ProductController::class, 'show']);
Route::get('/business-profile', [BusinessProfileController::class, 'show']);
Route::get('/testimonials', [TestimonialController::class, 'index']);
Route::post('/contact', [ContactController::class, 'store']);
Route::post('/payment/callback', [PaymentController::class, 'callback']);

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'read']);
    Route::post('/notifications/read-all', [NotificationController::class, 'readAll']);
    Route::middleware('role:customer')->post('/payment', [PaymentController::class, 'store']);
    Route::middleware('role:customer')->post('/payment/status', [PaymentController::class, 'status']);

    Route::middleware('role:admin')->group(function (): void {
        Route::get('/admin/products', [ProductController::class, 'adminIndex']);
        Route::post('/products', [ProductController::class, 'store']);
        Route::put('/products/{product}', [ProductController::class, 'update']);
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);
        Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
        Route::get('/admin/orders', [AdminOrderController::class, 'index']);
        Route::put('/admin/orders/{order}', [AdminOrderController::class, 'update']);
        Route::post('/admin/orders/{order}/payment-proof/verify', [AdminOrderController::class, 'verifyPaymentProof']);
        Route::post('/admin/orders/{order}/payment-proof/reject', [AdminOrderController::class, 'rejectPaymentProof']);
        Route::get('/admin/reports/sales-summary', [AdminSalesReportController::class, 'salesSummary']);
    });

    Route::middleware('role:customer')->group(function (): void {
        Route::post('/checkout', [CheckoutController::class, 'store']);
        Route::post('/orders/{order}/complete', [OrderController::class, 'complete']);
        Route::post('/orders/{order}/payment-proof', [OrderController::class, 'storePaymentProof']);
        Route::get('/testimonials/eligibility', [TestimonialController::class, 'eligibility']);
        Route::post('/testimonials', [TestimonialController::class, 'store']);
    });
});
