<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ExportMysqlImportSql extends Command
{
    protected $signature = 'larisdy:export-mysql-import
        {--sqlite=database/runtime.sqlite : Path file SQLite sumber}
        {--output=database/exports/larisdy_mysql_import.sql : Path file SQL hasil export}
        {--database=larisdy : Nama database MySQL tujuan}
        {--no-create-database : Jangan tulis CREATE DATABASE dan USE}';

    protected $description = 'Generate file SQL MySQL/MariaDB siap import dari database SQLite Larisdy.';

    private const SOURCE_CONNECTION = 'larisdy_sqlite_export_source';

    private const TABLES = [
        'migrations',
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

    private const TABLE_SCHEMAS = [
        'migrations' => <<<'SQL'
CREATE TABLE `migrations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `migration` VARCHAR(255) NOT NULL,
  `batch` INT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
        'users' => <<<'SQL'
CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `email_verified_at` TIMESTAMP NULL DEFAULT NULL,
  `password` VARCHAR(255) NOT NULL,
  `remember_token` VARCHAR(100) NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  `phone` VARCHAR(50) NULL DEFAULT NULL,
  `address` TEXT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'customer',
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
        'password_resets' => <<<'SQL'
CREATE TABLE `password_resets` (
  `email` VARCHAR(255) NOT NULL,
  `token` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
        'failed_jobs' => <<<'SQL'
CREATE TABLE `failed_jobs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` VARCHAR(255) NOT NULL,
  `connection` TEXT NOT NULL,
  `queue` TEXT NOT NULL,
  `payload` LONGTEXT NOT NULL,
  `exception` LONGTEXT NOT NULL,
  `failed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
        'personal_access_tokens' => <<<'SQL'
CREATE TABLE `personal_access_tokens` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tokenable_type` VARCHAR(255) NOT NULL,
  `tokenable_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `token` VARCHAR(64) NOT NULL,
  `abilities` TEXT NULL,
  `last_used_at` TIMESTAMP NULL DEFAULT NULL,
  `expires_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`, `tokenable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
        'products' => <<<'SQL'
CREATE TABLE `products` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `price` INT UNSIGNED NOT NULL,
  `image` VARCHAR(255) NOT NULL,
  `category` VARCHAR(255) NOT NULL,
  `spicy_level` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `weight` VARCHAR(50) NOT NULL,
  `stock` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
        'orders' => <<<'SQL'
CREATE TABLE `orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `code` VARCHAR(255) NOT NULL,
  `customer_name` VARCHAR(255) NOT NULL,
  `customer_email` VARCHAR(255) NOT NULL,
  `customer_phone` VARCHAR(50) NOT NULL,
  `shipping_address` TEXT NOT NULL,
  `shipping_latitude` DECIMAL(10,7) NULL DEFAULT NULL,
  `shipping_longitude` DECIMAL(10,7) NULL DEFAULT NULL,
  `shipping_courier` VARCHAR(50) NOT NULL DEFAULT 'jne',
  `notes` TEXT NULL,
  `payment_method` VARCHAR(30) NOT NULL,
  `subtotal` INT UNSIGNED NOT NULL,
  `shipping_cost` INT UNSIGNED NOT NULL DEFAULT 15000,
  `grand_total` INT UNSIGNED NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  `status_updated_at` TIMESTAMP NULL DEFAULT NULL,
  `payment_provider` VARCHAR(50) NULL DEFAULT NULL,
  `payment_token` VARCHAR(255) NULL DEFAULT NULL,
  `payment_url` TEXT NULL,
  `payment_status` VARCHAR(50) NULL DEFAULT NULL,
  `payment_reference` VARCHAR(255) NULL DEFAULT NULL,
  `payment_status_message` VARCHAR(255) NULL DEFAULT NULL,
  `payment_payload` JSON NULL,
  `payment_paid_at` TIMESTAMP NULL DEFAULT NULL,
  `payment_expires_at` TIMESTAMP NULL DEFAULT NULL,
  `tracking_number` VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `orders_code_unique` (`code`),
  KEY `orders_user_id_foreign` (`user_id`),
  CONSTRAINT `orders_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
        'order_items' => <<<'SQL'
CREATE TABLE `order_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `quantity` INT UNSIGNED NOT NULL,
  `price` INT UNSIGNED NOT NULL,
  `line_total` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_items_order_id_foreign` (`order_id`),
  KEY `order_items_product_id_foreign` (`product_id`),
  CONSTRAINT `order_items_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
        'business_profiles' => <<<'SQL'
CREATE TABLE `business_profiles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_name` VARCHAR(255) NOT NULL,
  `history` TEXT NOT NULL,
  `vision` TEXT NOT NULL,
  `missions` JSON NOT NULL,
  `support_email` VARCHAR(255) NOT NULL,
  `support_phone` VARCHAR(50) NOT NULL,
  `address` TEXT NOT NULL,
  `hero_title` VARCHAR(255) NOT NULL,
  `hero_subtitle` TEXT NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
        'testimonials' => <<<'SQL'
CREATE TABLE `testimonials` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `city` VARCHAR(255) NULL DEFAULT NULL,
  `rating` TINYINT UNSIGNED NOT NULL DEFAULT 5,
  `message` TEXT NOT NULL,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  `image` VARCHAR(255) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `testimonials_user_id_foreign` (`user_id`),
  CONSTRAINT `testimonials_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
        'contacts' => <<<'SQL'
CREATE TABLE `contacts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) NULL DEFAULT NULL,
  `message` TEXT NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
        'payment_proofs' => <<<'SQL'
CREATE TABLE `payment_proofs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `note` TEXT NULL,
  `uploaded_at` TIMESTAMP NULL DEFAULT NULL,
  `verification_status` VARCHAR(30) NOT NULL DEFAULT 'pending',
  `verified_at` TIMESTAMP NULL DEFAULT NULL,
  `verified_by` BIGINT UNSIGNED NULL DEFAULT NULL,
  `rejection_note` TEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `payment_proofs_order_id_verification_status_index` (`order_id`, `verification_status`),
  KEY `payment_proofs_user_id_foreign` (`user_id`),
  KEY `payment_proofs_verified_by_foreign` (`verified_by`),
  CONSTRAINT `payment_proofs_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payment_proofs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payment_proofs_verified_by_foreign` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
        'notifications' => <<<'SQL'
CREATE TABLE `notifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `role_target` VARCHAR(30) NULL DEFAULT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(80) NOT NULL,
  `reference_type` VARCHAR(80) NULL DEFAULT NULL,
  `reference_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `read_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_user_id_read_at_index` (`user_id`, `read_at`),
  KEY `notifications_role_target_read_at_index` (`role_target`, `read_at`),
  KEY `notifications_reference_type_reference_id_index` (`reference_type`, `reference_id`),
  CONSTRAINT `notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
    ];

    public function handle(): int
    {
        $sqlitePath = $this->absolutePath((string) $this->option('sqlite'));
        $outputPath = $this->absolutePath((string) $this->option('output'));
        $databaseName = (string) $this->option('database');

        if (! is_file($sqlitePath)) {
            $this->error("File SQLite tidak ditemukan: {$sqlitePath}");

            return self::FAILURE;
        }

        $this->configureSourceConnection($sqlitePath);

        $sql = $this->buildDump($databaseName);
        $outputDirectory = dirname($outputPath);

        if (! is_dir($outputDirectory)) {
            mkdir($outputDirectory, 0755, true);
        }

        file_put_contents($outputPath, $sql);

        $this->info("File SQL MySQL siap import dibuat: {$outputPath}");

        return self::SUCCESS;
    }

    private function buildDump(string $databaseName): string
    {
        $lines = [
            '-- Larisdy MySQL/MariaDB import',
            '-- Generated at ' . now()->toDateTimeString(),
            'SET NAMES utf8mb4;',
            "SET time_zone = '+00:00';",
            'SET FOREIGN_KEY_CHECKS=0;',
            '',
        ];

        if (! $this->option('no-create-database')) {
            $lines[] = 'CREATE DATABASE IF NOT EXISTS ' . $this->quoteIdentifier($databaseName) . ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;';
            $lines[] = 'USE ' . $this->quoteIdentifier($databaseName) . ';';
            $lines[] = '';
        }

        foreach (array_reverse(self::TABLES) as $table) {
            $lines[] = 'DROP TABLE IF EXISTS ' . $this->quoteIdentifier($table) . ';';
        }

        $lines[] = '';

        foreach (self::TABLES as $table) {
            $lines[] = self::TABLE_SCHEMAS[$table];
            $lines[] = '';
        }

        foreach (self::TABLES as $table) {
            $lines[] = $this->insertStatementsFor($table);
        }

        $lines[] = 'SET FOREIGN_KEY_CHECKS=1;';
        $lines[] = '';

        return implode(PHP_EOL, array_filter($lines, static fn ($line) => $line !== null));
    }

    private function insertStatementsFor(string $table): string
    {
        if (! Schema::connection(self::SOURCE_CONNECTION)->hasTable($table)) {
            return "-- Table {$table} was not present in SQLite source.";
        }

        $rows = DB::connection(self::SOURCE_CONNECTION)
            ->table($table)
            ->get()
            ->map(static fn ($row) => (array) $row)
            ->all();

        if ($rows === []) {
            return "-- Table {$table} has no data.";
        }

        $columns = array_keys($rows[0]);
        $quotedColumns = implode(', ', array_map([$this, 'quoteIdentifier'], $columns));
        $statements = ["-- Data for {$table}"];

        foreach (array_chunk($rows, 250) as $chunk) {
            $values = array_map(function (array $row) use ($columns): string {
                $rowValues = array_map(fn ($column) => $this->mysqlValue($row[$column] ?? null), $columns);

                return '(' . implode(', ', $rowValues) . ')';
            }, $chunk);

            $statements[] = 'INSERT INTO ' . $this->quoteIdentifier($table) . " ({$quotedColumns}) VALUES";
            $statements[] = implode(',' . PHP_EOL, $values) . ';';
        }

        return implode(PHP_EOL, $statements) . PHP_EOL;
    }

    private function mysqlValue(mixed $value): string
    {
        if ($value === null) {
            return 'NULL';
        }

        $value = (string) $value;
        $escaped = strtr($value, [
            "\\" => "\\\\",
            "'" => "\\'",
            "\0" => "\\0",
            "\n" => "\\n",
            "\r" => "\\r",
            "\x1a" => "\\Z",
        ]);

        return "'{$escaped}'";
    }

    private function quoteIdentifier(string $identifier): string
    {
        return '`' . str_replace('`', '``', $identifier) . '`';
    }

    private function configureSourceConnection(string $sqlitePath): void
    {
        config([
            'database.connections.' . self::SOURCE_CONNECTION => [
                'driver' => 'sqlite',
                'database' => $sqlitePath,
                'prefix' => '',
                'foreign_key_constraints' => true,
            ],
        ]);

        DB::purge(self::SOURCE_CONNECTION);
    }

    private function absolutePath(string $path): string
    {
        $normalizedPath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $path);

        if (preg_match('/^[A-Za-z]:\\\\/', $normalizedPath) || str_starts_with($normalizedPath, DIRECTORY_SEPARATOR)) {
            return $normalizedPath;
        }

        return base_path($normalizedPath);
    }
}
