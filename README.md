# Larisdy.com

Larisdy adalah website e-commerce sederhana untuk produk sambal premium Indonesia.

## Status Repo

Repo ini sekarang memiliki beberapa versi/folder penting:

- `src/` adalah versi statis asli berbasis HTML, CSS, dan JavaScript
- `frontend/` adalah hasil migrasi UI ke React + Vite
- `backend/` adalah blueprint/source file migrasi Laravel API
- `backend_runtime/` adalah project Laravel yang sudah runnable di mesin ini

## Fitur

- Navigation page: home, products, cart, login, register, checkout, account
- Product listing dan product detail
- Cart system berbasis React Context
- Checkout ke Laravel API
- Authentication ke Laravel API
- Order history dari database Laravel

## Struktur Folder

```text
Larisdy.com/
├── backend/              # Blueprint/source Laravel API
├── backend_runtime/      # Laravel runnable hasil setup
├── docs/                 # Dokumentasi proyek dan migrasi
├── frontend/             # React + Vite
├── src/                  # Versi statis asli
├── tests/                # Pengujian lama
├── test-login.js
└── README.md
```

## Dokumentasi Migrasi

Lihat:

- `docs/migration/react-laravel-migration.md`
- `backend/README.md`

## Catatan

Versi statis lama memakai `localStorage` untuk auth, cart, dan order.

Pada hasil migrasi:

- auth dipindahkan ke Laravel API
- cart dipindahkan ke React state
- orders dipindahkan ke database Laravel

## Jalankan Sekarang

Frontend:

```powershell
cd "C:\Users\umarv\Downloads\Larisdy.com-main\Larisdy.com-main\frontend"
npm.cmd run dev
```

Backend:

```powershell
cd "C:\Users\umarv\Downloads\Larisdy.com-main\Larisdy.com-main\backend_runtime"
php artisan serve
```

## Verifikasi Otomatis

Jalankan semua verifikasi dari root project:

```powershell
cd "C:\Users\umarv\Downloads\Larisdy.com-main\Larisdy.com-main"
powershell -ExecutionPolicy Bypass -File .\test-all.ps1
```

Script ini menjalankan:

- `php artisan test`
- `npm.cmd run build`
- `npm.cmd run test:e2e`

Kalau perlu, Anda juga bisa skip sebagian langkah:

```powershell
powershell -ExecutionPolicy Bypass -File .\test-all.ps1 -SkipE2E
```

## Deploy Demo Gratis

Backend Laravel bisa dideploy ke Render memakai Blueprint `render.yaml`:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/anjat6262/larisdy-demo)

Frontend React bisa dideploy ke Vercel dari folder `frontend/`.

Pengaturan Vercel:

- Framework preset: `Vite`
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE_URL=https://larisdy-api.onrender.com/api`
