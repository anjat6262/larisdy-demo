<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CopySqliteToMysql extends Command
{
    protected $signature = 'larisdy:copy-sqlite-to-mysql
        {--sqlite= : Path file SQLite sumber, default database/runtime.sqlite}
        {--mysql=mysql : Nama koneksi MySQL tujuan}
        {--truncate : Kosongkan tabel tujuan sebelum import}
        {--force : Jalankan tanpa prompt konfirmasi untuk --truncate}';

    protected $description = 'Copy data Larisdy dari SQLite lama ke database MySQL/MariaDB yang sudah dimigrasi.';

    private const SOURCE_CONNECTION = 'larisdy_sqlite_source';

    private const TABLES = [
        'users',
        'password_resets',
        'failed_jobs',
        'personal_access_tokens',
        'products',
        'orders',
        'order_items',
        'business_profiles',
        'testimonials',
        'contacts',
        'payment_proofs',
        'notifications',
    ];

    public function handle(): int
    {
        $sqlitePath = $this->resolveSqlitePath();
        $mysqlConnection = (string) $this->option('mysql');

        if (! is_file($sqlitePath)) {
            $this->error("File SQLite tidak ditemukan: {$sqlitePath}");

            return self::FAILURE;
        }

        if ((string) config("database.connections.{$mysqlConnection}.driver") !== 'mysql') {
            $this->error("Koneksi {$mysqlConnection} bukan koneksi mysql.");

            return self::FAILURE;
        }

        config([
            'database.connections.' . self::SOURCE_CONNECTION => [
                'driver' => 'sqlite',
                'database' => $sqlitePath,
                'prefix' => '',
                'foreign_key_constraints' => true,
            ],
        ]);

        DB::purge(self::SOURCE_CONNECTION);
        DB::purge($mysqlConnection);

        $this->assertTablesExist($mysqlConnection);

        if ($this->hasTargetData($mysqlConnection) && ! $this->option('truncate')) {
            $this->error('Database MySQL tujuan sudah berisi data. Jalankan dengan --truncate jika ingin mengganti isi tabel.');

            return self::FAILURE;
        }

        if ($this->option('truncate') && ! $this->option('force')) {
            if (! $this->confirm('Ini akan menghapus isi tabel tujuan sebelum import. Lanjutkan?')) {
                return self::FAILURE;
            }
        }

        DB::connection($mysqlConnection)->transaction(function () use ($mysqlConnection): void {
            if ($this->option('truncate')) {
                $this->truncateTargetTables($mysqlConnection);
            }

            foreach (self::TABLES as $table) {
                if (! Schema::connection(self::SOURCE_CONNECTION)->hasTable($table)) {
                    $this->warn("Skip {$table}: tidak ada di SQLite sumber.");
                    continue;
                }

                $rows = DB::connection(self::SOURCE_CONNECTION)
                    ->table($table)
                    ->get()
                    ->map(fn ($row) => (array) $row)
                    ->all();

                if ($rows === []) {
                    $this->line("Skip {$table}: kosong.");
                    continue;
                }

                foreach (array_chunk($rows, 500) as $chunk) {
                    DB::connection($mysqlConnection)->table($table)->insert($chunk);
                }

                $this->info("Imported {$table}: " . count($rows) . ' rows.');
            }
        });

        $this->info('Import SQLite ke MySQL selesai.');

        return self::SUCCESS;
    }

    private function resolveSqlitePath(): string
    {
        $configuredPath = $this->option('sqlite') ?: database_path('runtime.sqlite');
        $normalizedPath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, (string) $configuredPath);

        if (preg_match('/^[A-Za-z]:\\\\/', $normalizedPath) || str_starts_with($normalizedPath, DIRECTORY_SEPARATOR)) {
            return $normalizedPath;
        }

        return base_path($normalizedPath);
    }

    private function assertTablesExist(string $mysqlConnection): void
    {
        foreach (self::TABLES as $table) {
            if (! Schema::connection(self::SOURCE_CONNECTION)->hasTable($table)) {
                $this->warn("Tabel {$table} tidak ada di SQLite sumber, akan dilewati.");
            }

            if (! Schema::connection($mysqlConnection)->hasTable($table)) {
                throw new \RuntimeException("Tabel {$table} belum ada di MySQL. Jalankan php artisan migrate terlebih dahulu.");
            }
        }
    }

    private function hasTargetData(string $mysqlConnection): bool
    {
        foreach (self::TABLES as $table) {
            if (DB::connection($mysqlConnection)->table($table)->exists()) {
                return true;
            }
        }

        return false;
    }

    private function truncateTargetTables(string $mysqlConnection): void
    {
        DB::connection($mysqlConnection)->statement('SET FOREIGN_KEY_CHECKS=0');

        foreach (array_reverse(self::TABLES) as $table) {
            DB::connection($mysqlConnection)->table($table)->truncate();
        }

        DB::connection($mysqlConnection)->statement('SET FOREIGN_KEY_CHECKS=1');
    }
}
