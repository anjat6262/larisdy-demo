<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        Product::query()->upsert([
            [
                'id' => 1,
                'name' => 'Sambal Roa',
                'description' => 'Sambal ikan roa khas Manado dengan cita rasa pedas gurih yang autentik. Dibuat dari ikan roa asap pilihan dan bumbu tradisional.',
                'price' => 48000,
                'image' => 'images/sambalroa.jpeg',
                'category' => 'Sambal Premium',
                'spicy_level' => 4,
                'weight' => '180g',
                'stock' => 35,
            ],
            [
                'id' => 2,
                'name' => 'Sambal Cakalang Fu Fu',
                'description' => 'Sambal ikan cakalang asap khas Manado dengan cita rasa yang kaya dan gurih. Perpaduan sempurna antara pedas dan gurih.',
                'price' => 45000,
                'image' => 'images/sambalcakalang.jpeg',
                'category' => 'Sambal Premium',
                'spicy_level' => 4,
                'weight' => '180g',
                'stock' => 30,
            ],
            [
                'id' => 3,
                'name' => 'Abon Tuna',
                'description' => 'Abon tuna premium dengan tekstur lembut dan rasa yang gurih. Cocok untuk teman makan nasi atau roti.',
                'price' => 38000,
                'image' => 'images/abontuna.jpeg',
                'category' => 'Abon',
                'spicy_level' => 2,
                'weight' => '100g',
                'stock' => 40,
            ],
            [
                'id' => 4,
                'name' => 'Kacang Batik',
                'description' => 'Kacang tanah batik dengan bumbu khas yang renyah dan gurih. Camilan sempurna untuk berbagai momen.',
                'price' => 22000,
                'image' => 'images/kacangbatik.jpeg',
                'category' => 'Snack',
                'spicy_level' => 2,
                'weight' => '125g',
                'stock' => 50,
            ],
        ], ['id'], [
            'name',
            'description',
            'price',
            'image',
            'category',
            'spicy_level',
            'weight',
            'stock',
        ]);
    }
}
