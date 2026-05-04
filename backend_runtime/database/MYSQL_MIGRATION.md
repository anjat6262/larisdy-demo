# Migrasi Database Larisdy dari SQLite ke MySQL/MariaDB

Panduan ini menjaga data lama tetap aman. Jangan jalankan `migrate:fresh` pada database produksi yang sudah berisi data.

## 1. Backup SQLite Lama

Salin file SQLite yang sedang dipakai sebelum mengubah `.env`.

```bash
cp database/runtime.sqlite database/runtime.sqlite.backup
```

Di Windows PowerShell:

```powershell
Copy-Item database/runtime.sqlite database/runtime.sqlite.backup
```

## 2. Buat Database MySQL

```sql
CREATE DATABASE larisdy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 3. Update `.env`

Jangan commit `.env`. Gunakan contoh berikut:

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=larisdy
DB_USERNAME=root
DB_PASSWORD=
DB_ENGINE=InnoDB
```

## 4. Jalankan Migration di MySQL

```bash
php artisan config:clear
php artisan migrate
```

Untuk database baru yang kosong dan ingin isi data seed default:

```bash
php artisan migrate:fresh --seed
```

## 5. Import Data SQLite Lama ke MySQL

### Opsi A: Import file `.sql` langsung

Jika ingin langsung import lewat phpMyAdmin/MySQL client, generate file SQL:

```bash
php artisan larisdy:export-mysql-import --sqlite=database/runtime.sqlite --output=database/exports/larisdy_mysql_import.sql --database=larisdy
```

Lalu import `database/exports/larisdy_mysql_import.sql` ke MySQL/phpMyAdmin. File ini sudah berisi schema, foreign key, data, dan isi tabel `migrations`.

Melalui terminal:

```bash
mysql -u root -p < database/exports/larisdy_mysql_import.sql
```

Setelah import, update `.env` ke MySQL lalu jalankan:

```bash
php artisan config:clear
php artisan migrate:status
```

### Opsi B: Copy via Artisan langsung

Pastikan `.env` sudah mengarah ke MySQL dan migration MySQL sudah selesai.

```bash
php artisan larisdy:copy-sqlite-to-mysql --sqlite=database/runtime.sqlite
```

Jika database MySQL tujuan sudah terisi dan memang ingin diganti dengan data SQLite:

```bash
php artisan larisdy:copy-sqlite-to-mysql --sqlite=database/runtime.sqlite --truncate
```

Untuk non-interaktif:

```bash
php artisan larisdy:copy-sqlite-to-mysql --sqlite=database/runtime.sqlite --truncate --force
```

## 6. Verifikasi Aplikasi

Checklist setelah migrasi:

- Login admin: `Larisdy.5@gmail.com`
- Login customer: `user@gmail.com`
- Buka katalog produk
- Checkout order QRIS
- Upload bukti pembayaran
- Admin verifikasi/tolak bukti
- Admin update status pesanan dan resi
- Cek laporan penjualan
- Uji callback/webhook payment sesuai environment

## Catatan Integritas Data

- Produk tidak dihapus permanen dari UI admin; produk diarsipkan agar histori order tetap aman.
- `order_items.product_id` memakai `restrictOnDelete`, sehingga produk yang sudah pernah dipesan tidak bisa terhapus dan merusak histori.
- `orders.user_id` memakai cascade sesuai data ownership user.
- `payment_proofs`, `notifications`, dan item order mengikuti order/user terkait melalui foreign key.
