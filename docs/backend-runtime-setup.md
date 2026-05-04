# Setup Backend Runtime

Backend Laravel yang sudah runnable ada di folder:

- `backend_runtime/`

## Yang sudah disiapkan

- Composer lokal sudah dipakai untuk install dependency
- Laravel 8 sudah terpasang
- Sanctum sudah aktif
- Database SQLite lokal sudah dibuat
- Migration sudah dijalankan
- Seeder produk dan demo user sudah dijalankan

## Cara menjalankan backend

```powershell
cd "C:\Users\umarv\Downloads\Larisdy.com-main\Larisdy.com-main\backend_runtime"
php artisan serve
```

Backend akan aktif di:

- `http://127.0.0.1:8000`

## Endpoint yang bisa langsung dicoba

Produk:

```powershell
Invoke-RestMethod "http://127.0.0.1:8000/api/products"
```

Login demo:

```powershell
$body = @{
  email = "demo@larisdy.com"
  password = "demo123"
} | ConvertTo-Json

Invoke-RestMethod "http://127.0.0.1:8000/api/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

## Kredensial demo

- Email: `demo@larisdy.com`
- Password: `demo123`

## Database lokal

File SQLite berada di:

- `backend_runtime/database/database.sqlite`

Kalau ingin reset database:

```powershell
cd "C:\Users\umarv\Downloads\Larisdy.com-main\Larisdy.com-main\backend_runtime"
php artisan migrate:fresh --seed
```
