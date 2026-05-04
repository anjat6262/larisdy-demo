<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'admin@larisdy.com'],
            [
                'name' => 'Admin Larisdy',
                'phone' => '0812-0000-0001',
                'address' => 'Jl. Toko Larisdy No. 1, Jakarta',
                'role' => User::ROLE_ADMIN,
                'password' => Hash::make('password'),
            ]
        );

        User::query()->updateOrCreate(
            ['email' => 'user@gmail.com'],
            [
                'name' => 'Customer Larisdy',
                'phone' => '0812-0000-0002',
                'address' => 'Jl. Pelanggan No. 2, Bandung',
                'role' => User::ROLE_CUSTOMER,
                'password' => Hash::make('password'),
            ]
        );

        $this->call([
            ProductSeeder::class,
            BusinessProfileSeeder::class,
            TestimonialSeeder::class,
        ]);
    }
}
