<?php

namespace Database\Seeders;

use App\Models\Testimonial;
use Illuminate\Database\Seeder;

class TestimonialSeeder extends Seeder
{
    public function run(): void
    {
        Testimonial::query()->upsert([
            [
                'id' => 1,
                'product_id' => 1,
                'order_id' => null,
                'name' => 'Rani Putri',
                'email' => 'rani@example.com',
                'city' => 'Jakarta',
                'rating' => 5,
                'message' => 'Sambalnya enak, kemasannya rapi, dan proses checkout-nya sekarang jauh lebih gampang.',
                'is_published' => true,
            ],
            [
                'id' => 2,
                'product_id' => 3,
                'order_id' => null,
                'name' => 'Dimas Prakoso',
                'email' => 'dimas@example.com',
                'city' => 'Bandung',
                'rating' => 5,
                'message' => 'Abon tuna favorit saya. Pesanan datang cepat dan update statusnya jelas.',
                'is_published' => true,
            ],
            [
                'id' => 3,
                'product_id' => 2,
                'order_id' => null,
                'name' => 'Nabila Sari',
                'email' => 'nabila@example.com',
                'city' => 'Surabaya',
                'rating' => 4,
                'message' => 'Website-nya nyaman dipakai, produknya juga konsisten rasanya. Saya sudah repeat order beberapa kali.',
                'is_published' => true,
            ],
        ], ['id'], ['product_id', 'order_id', 'name', 'email', 'city', 'rating', 'message', 'is_published']);
    }
}
