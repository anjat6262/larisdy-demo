# Migrasi HTML/CSS/JS ke React + Laravel

## Ringkasan

Versi statis lama tetap disimpan di folder `src/` sebagai referensi UI asli. Hasil migrasi baru dibagi menjadi:

- `frontend/` untuk React + Vite
- `backend/` untuk blueprint/source Laravel REST API
- `backend_runtime/` untuk project Laravel runnable

## Struktur Frontend React

```text
frontend/
├── public/
│   └── images/
├── src/
│   ├── components/
│   │   ├── account/
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── common/
│   │   ├── layout/
│   │   └── products/
│   ├── contexts/
│   ├── data/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   ├── utils/
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── index.html
├── package.json
└── vite.config.js
```

### Mapping fitur lama ke React

- `showPage()` diubah menjadi routing React Router di `frontend/src/App.jsx`
- `renderProducts()` diubah menjadi page `ProductsPage.jsx` + komponen `ProductCard.jsx`
- `showProductDetail()` diubah menjadi route `/products/:productId`
- `localStorage` cart diubah menjadi `CartContext.jsx`
- form login/register diubah menjadi controlled component di `LoginPage.jsx` dan `RegisterPage.jsx`
- efek scroll, reveal, ripple, dan escape dipindah ke hook `useUiEffects.js`

## Struktur Backend Laravel

```text
backend/
├── app/
│   ├── Http/
│   │   └── Controllers/
│   │       └── Api/
│   └── Models/
├── database/
│   ├── migrations/
│   └── seeders/
├── routes/
│   └── api.php
├── composer.json
└── .env.example
```

### File backend utama

- `routes/api.php` untuk endpoint REST
- `app/Http/Controllers/Api/AuthController.php` untuk login/register/logout/me
- `app/Http/Controllers/Api/ProductController.php` untuk listing dan detail produk
- `app/Http/Controllers/Api/CheckoutController.php` untuk pembuatan order
- `app/Http/Controllers/Api/OrderController.php` untuk riwayat pesanan
- `app/Http/Controllers/Api/ProfileController.php` untuk update profil
- `database/migrations/*` untuk tabel produk, order, dan order item
- `database/seeders/ProductSeeder.php` untuk seed produk awal

## Contoh Endpoint

### GET `/api/products`

Mengambil seluruh katalog produk.

Contoh response:

```json
{
  "data": [
    {
      "id": 1,
      "name": "Sambal Roa",
      "description": "Sambal ikan roa khas Manado...",
      "price": 48000,
      "image": "images/sambalroa.jpeg",
      "category": "Sambal Premium",
      "spicy_level": 4,
      "weight": "180g",
      "stock": 35
    }
  ],
  "meta": {
    "categories": ["Semua", "Sambal Premium", "Abon", "Snack"]
  }
}
```

### POST `/api/login`

Request:

```json
{
  "email": "demo@larisdy.com",
  "password": "demo123"
}
```

Response:

```json
{
  "message": "Login berhasil.",
  "token": "plain-text-token",
  "user": {
    "id": 1,
    "name": "Demo User",
    "email": "demo@larisdy.com",
    "phone": "0812-3456-7890",
    "address": "Jl. Sudirman No. 123, Jakarta Pusat"
  }
}
```

### POST `/api/checkout`

Request:

```json
{
  "customer_name": "Demo User",
  "customer_email": "demo@larisdy.com",
  "customer_phone": "0812-3456-7890",
  "shipping_address": "Jl. Sudirman No. 123, Jakarta Pusat",
  "notes": "Tolong kirim cepat",
  "payment_method": "transfer",
  "items": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 3, "quantity": 1 }
  ]
}
```

## Contoh Integrasi React ke API

Service fetch berada di:

- `frontend/src/services/apiClient.js`
- `frontend/src/services/authService.js`
- `frontend/src/services/productService.js`
- `frontend/src/services/orderService.js`

Contoh alur fetch:

```js
const response = await apiClient.post("/login", credentials);
storeToken(response.token);
setUser(response.user);
```

Contoh data produk dari Laravel lalu dinormalisasi ke format React:

```js
function normalizeProduct(product) {
  return {
    ...product,
    spicyLevel: product.spicy_level,
  };
}
```

## Refactor JS Lama ke React Hooks

### Sebelum

- event listener manual
- `innerHTML`
- `showPage()`
- state global seperti `cart`, `currentUser`, `selectedCategory`

### Sesudah

- `useState` untuk form, category, quantity, dan halaman detail
- `useEffect` untuk fetch API, bootstrap auth, scroll effect, dan parallax
- `useContext` untuk auth, cart, dan toast
- `useNavigate` + route React menggantikan pindah halaman manual

## Catatan Integrasi

- Auth user sekarang berasal dari Laravel API, bukan daftar user di `localStorage`
- Cart dikelola oleh React Context dan siap diperluas ke endpoint cart bila dibutuhkan
- Orders dipersist ke database Laravel melalui endpoint checkout
- Gambar produk tetap memakai aset lama agar UI tetap mirip dengan versi HTML asli
- Project Laravel yang benar-benar bisa dijalankan ada di `backend_runtime/`
