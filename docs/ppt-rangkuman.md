# PickaThrift — Rangkuman untuk Presentasi

Kelompok 19 · Web Thrift Store (US6, mode reguler)

---

## 1. Masalah & Tujuan

**Masalah**

- Produk thrift itu unik, stoknya hanya satu. Kalau toko berjualan manual lewat chat, dua pembeli bisa sama-sama merasa sudah membeli barang yang sama.
- Katalog, status ketersediaan, dan pesanan tersebar, jadi sulit dipantau.
- Pembeli susah memilih pakaian bekas yang ukurannya pas.

**Tujuan**

- Satu web store yang menyatukan katalog, ketersediaan, dan pesanan.
- **Mencegah double-buy** dengan reservasi atomik untuk produk berstok satu.
- Membantu Buyer mencari, menyimpan, membandingkan, memesan, dan mengulas produk.

---

## 2. Target & Peran

**Target pengguna:** satu usaha thrift beserta pembelinya.

| Peran     | Yang bisa dilakukan                                                                           |
| --------- | --------------------------------------------------------------------------------------------- |
| **Buyer** | Cari, filter, wishlist, bandingkan, pesan, upload bukti bayar, terima barang, beri ulasan     |
| **Admin** | CRUD produk, verifikasi bukti bayar, kirim + nomor resi, batalkan pesanan, pantau status      |

**Tim**

| Nama                        | Peran                               |
| --------------------------- | ----------------------------------- |
| Rasyadwa Arsya Irnantyanto  | Project Manager, bantu FE & BE      |
| Annora Farah Aprilla S.     | _isi peran_                         |
| Harum Satiti Astyanti       | _isi peran_                         |
| Muhammad Farrel Al Ghazy    | _isi peran_                         |

---

## 3. Scope

**Masuk scope**

- Katalog dengan pencarian, filter, pengurutan, dan status (Tersedia / Dipesan / Terjual)
- Detail produk, termasuk ukuran dalam cm
- Registrasi/login dengan otorisasi Buyer & Admin (JWT)
- Wishlist, Cari yang Cocok (berdasarkan preferensi + ukuran), Meja Perbandingan (maks. 2 produk)
- Beli langsung → transfer manual → upload bukti bayar, dengan **batas bayar 6 jam**
- Riwayat & status pesanan, rating dan ulasan setelah pesanan selesai
- Panel Admin: produk dan pesanan

**Di luar scope**

- Payment gateway, keranjang, Blindbox, refund, newsletter (belum tersedia)

---

## 4. Demo

Alur yang diperagakan:

1. **Buyer** daftar/login → cari produk → Cari yang Cocok → bandingkan → wishlist
2. Beli langsung → produk jadi **Dipesan** → hitung mundur 6 jam → upload bukti bayar
3. **Admin** login → verifikasi bukti → kirim dengan kurir + resi
4. **Buyer** konfirmasi diterima → pesanan **Selesai** → beri ulasan
5. Bonus: dua akun membeli produk yang sama, hanya satu yang berhasil

---

## 5. Tech Stack

| Lapisan       | Teknologi                                                  |
| ------------- | ---------------------------------------------------------- |
| Frontend      | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Backend       | Express 5, Mongoose 9                                      |
| Database      | MongoDB (replica set / Atlas, dibutuhkan untuk transaksi)  |
| Auth & upload | JWT, bcryptjs, Multer                                      |
| Pengujian     | Vitest, Playwright, Postman                                |
| Tooling       | pnpm workspace (monorepo), ESLint, Prettier, Git/GitHub, Figma |

---

## 6. User Story Inti

- Sebagai **Buyer**, saya ingin mencari dan memfilter produk supaya cepat menemukan barang yang saya mau.
- Sebagai **Buyer**, saya ingin mencari produk berdasarkan ukuran badan saya supaya pakaiannya pas.
- Sebagai **Buyer**, saya ingin menyimpan dan membandingkan produk sebelum memutuskan membeli.
- Sebagai **Buyer**, saya ingin produk langsung dikunci untuk saya saat checkout supaya tidak direbut pembeli lain.
- Sebagai **Buyer**, saya ingin melihat status pesanan dan memberi ulasan setelah barang diterima.
- Sebagai **Admin**, saya ingin mengelola produk dan ketersediaannya.
- Sebagai **Admin**, saya ingin memverifikasi bukti bayar dan mengirim pesanan dengan nomor resi.

---

## 7. API

Base URL `/api`, format JSON, akses dengan `Authorization: Bearer <JWT>`.

| Modul    | Endpoint utama                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------- |
| Auth     | `POST /auth/register`, `POST /auth/login`                                                                   |
| Profil   | `GET /users/me`, `PATCH /users/me`                                                                          |
| Produk   | `GET /products`, `GET /products/:id`, `POST /products/match`                                                |
| Admin    | `POST/PATCH/DELETE /products/:id`, `GET /admin/products`, `POST /admin/product-images`                      |
| Wishlist | `GET /wishlist`, `POST /wishlist/:productId`, `DELETE /wishlist/:productId`                                 |
| Pesanan  | `POST /orders`, `GET /orders/my`, `GET /orders/:id`, `POST /orders/:id/cancel`, `POST /orders/:id/receive` |
| Bayar    | `POST /orders/:id/payment-proof`, `GET /orders/:id/payment-proof`                                           |
| Admin    | `GET /admin/orders`, `POST /admin/orders/:id/actions` (approve / reupload / reject / ship)                  |
| Ulasan   | `POST /orders/:id/review`, `GET /reviews`                                                                   |

Kode status: 401 tanpa token · 403 akun salah · 404 tidak ada · 409 konflik stok/status · 422 validasi gagal.

---

## 8. Uji API via Postman

Skenario yang diuji (bukti tersimpan di folder Google Drive proyek):

1. **Register & login**: simpan token ke variabel environment `{{token}}`
2. **Katalog**: `GET /products` dengan query filter/sort, lalu `POST /products/match`
3. **Pesan**: `POST /orders` → status 201, produk berubah jadi Dipesan
4. **Rebutan stok**: akun kedua memesan produk yang sama → **409**
5. **Upload bukti** (form-data) → Admin `approve` → `ship` + resi → Buyer `receive`
6. **Ulasan**: `POST /orders/:id/review` setelah pesanan Selesai
7. **Negatif**: tanpa token → 401, Buyer membuka endpoint Admin → 403, body salah → 422

Selain Postman, ada pengujian otomatis: **254 tes BE**, **158 tes FE**, dan **6 tes E2E Playwright**, semuanya lulus.
