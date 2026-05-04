<?php

namespace Database\Seeders;

use App\Models\BusinessProfile;
use Illuminate\Database\Seeder;

class BusinessProfileSeeder extends Seeder
{
    public function run(): void
    {
        BusinessProfile::query()->updateOrCreate(
            ['company_name' => 'Larisdy'],
            [
                'history' => 'Larisdy lahir dari semangat membawa sambal dan camilan khas Indonesia ke pengalaman belanja digital yang modern. Berawal dari dapur rumahan dengan resep keluarga, Larisdy berkembang menjadi brand yang mengutamakan rasa autentik, kualitas bahan, dan pelayanan yang hangat untuk pelanggan di berbagai kota.',
                'vision' => 'Menjadi brand sambal khas Indonesia yang terpercaya, modern, dan mampu menjangkau pasar nasional melalui platform digital.',
                'missions' => [
                    'Menyediakan produk berkualitas dengan cita rasa autentik',
                    'Memberikan pengalaman belanja mudah & aman',
                    'Memanfaatkan teknologi digital untuk pemasaran',
                    'Membangun kepercayaan pelanggan',
                ],
                'support_email' => 'Larisdy.5@gmail.com',
                'support_phone' => '858-2355-4027',
                'address' => 'Sentra IKM Kakenturan 1, Kec. Maesa, Sulawesi Utara',
                'hero_title' => 'Sambal Premium Khas Indonesia',
                'hero_subtitle' => 'Belanja sambal, abon, dan camilan premium Larisdy dengan alur checkout digital yang aman dan pengalaman yang modern.',
            ],
        );
    }
}
