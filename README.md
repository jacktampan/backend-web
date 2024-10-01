
# Kost Management API

API untuk manajemen kost yang dibangun menggunakan Node.js, Express, dan Sequelize. API ini memungkinkan pengguna untuk mendaftar, login, mengelola produk kost, melakukan pemesanan, dan memberikan ulasan.

## Prerequisites

Sebelum memulai, pastikan Anda memiliki hal-hal berikut:

- [Node.js](https://nodejs.org/) (versi 14 atau lebih baru)
- [MySQL](https://www.mysql.com/) (atau database lain yang didukung oleh Sequelize)
- [npm](https://www.npmjs.com/) (biasanya sudah terinstal dengan Node.js)

## Instalasi

1. **Clone repository ini:**

   ```bash
   git clone https://github.com/jacktampan/backend-web.git
   cd backend-web
   ```

2. **Instal dependensi:**

   ```bash
   npm install
   ```

3. **Konfigurasi database:**

   - Buat database baru di MySQL dengan nama `db_kost`.
   - Ubah konfigurasi database di file server.js (host, username, password).

4. **Menjalankan migrasi dan sinkronisasi database:**

   Pastikan telah mengatur model Sequelize dengan benar. Kode ini sudah termasuk sinkronisasi database saat aplikasi dijalankan.

## Menjalankan Aplikasi

1. **Jalankan server:**

   ```bash
   npm start
   ```

   Server akan berjalan di `http://localhost:3000`.

## Endpoint API

Berikut adalah beberapa endpoint yang tersedia:

- **Register User:**
  - `POST /api/auth/register/user`
  
- **Login:**
  - `POST /api/auth/login`

- **Mendapatkan Produk:**
  - `GET /api/products`
  - `GET /api/products/:id`

- **Membuat Produk (Admin):**
  - `POST /api/products`

- **Membuat Order:**
  - `POST /api/orders`

- **Mendapatkan Order:**
  - `GET /api/orders`

- **Membuat Review:**
  - `POST /api/products/:id/reviews`

## Penggunaan

Setelah server berjalan, Anda dapat menggunakan alat seperti [Postman](https://www.postman.com/) untuk menguji endpoint API.

## Catatan

- Pastikan untuk mengatur variabel lingkungan yang diperlukan, seperti `JWT_SECRET` untuk token JWT.
- Anda dapat menambahkan middleware tambahan untuk keamanan dan validasi sesuai kebutuhan.

## Lisensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE).
