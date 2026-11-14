# Kontrak API BE — batch 1

Baseline: `5c506d1`. Batch ini menangani akses, validasi dasar, dan respons galat.
Model produk, alamat terstruktur, transaksi stok, pembayaran, serta aturan ulasan lengkap
masih dikerjakan pada batch berikutnya. Endpoint lama tersebut belum siap produksi.

## Aturan umum

- Base URL lokal: `http://localhost:5000/api`.
- JSON sukses: `{ "success": true, "data": ... }`; metadata seperti `count` di luar `data`.
- JSON galat: `{ "success": false, "code": "...", "message": "...", "errors"?: {...} }`.
- Data menggunakan `id` string, tanpa `_id`, `__v`, hash sandi, atau dokumen database mentah.
  Field domain lama seperti `product_id` tetap dipakai sampai batch domain terkait.
- Route privat membutuhkan `Authorization: Bearer <token>`.
- `401`: token hilang/salah/kedaluwarsa, akun sudah dihapus, atau kredensial salah.
  `403`: peran salah atau bukan pemilik data. `404`: resource tidak ada.
  `409`: duplikat/konflik. `422`: input atau ID bukan ObjectId 24 karakter heksadesimal.
- JSON rusak menghasilkan `422`; body terlalu besar `413`; galat internal tidak memuat detail database.
- Token Buyer berlaku 24 jam dan Admin 2 jam. Peran diambil ulang dari database pada setiap
  request privat. Belum ada endpoint pencabutan token/logout server.

## Auth dan profil

| Method | Route            | Akses      | Body / hasil                                                                                                               |
| ------ | ---------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/register` | Publik     | `name`, `email`, `password`; opsional `confirmPassword`, `phone`, `address`. Hasil `201`, `data` pengguna Buyer.           |
| POST   | `/auth/login`    | Publik     | `email`, `password`, opsional `role: buyer/admin` untuk memeriksa halaman masuk yang dipilih. Hasil `data: {token, user}`. |
| GET    | `/users/me`      | Akun aktif | `data` profil akun dari token.                                                                                             |
| PATCH  | `/users/me`      | Akun aktif | Hanya `name`, `phone`, `address`; minimal satu field. `address` sementara masih string.                                    |

Email di-trim dan dijadikan huruf kecil. Nama tidak kosong, maksimal 100 karakter; email
maksimal 254 karakter dengan format `nama@domain.tld`. Sandi registrasi minimal 8 karakter
dan maksimal 72 byte UTF-8 (batas bcrypt); sandi tidak di-trim. Login tidak memaksakan
minimal 8 karakter agar kredensial lama tetap dapat diperiksa. `confirmPassword`, bila
dikirim, harus cocok. Field `role` saat registrasi diabaikan: hasil selalu Buyer.
Registrasi duplikat, termasuk request bersamaan, menghasilkan `409 EMAIL_EXISTS`.
`phone` maksimal 30 karakter dan `address` maksimal 1000 karakter pada model sementara.
PATCH profil tidak menerima email, password, role, ID, ataupun operator MongoDB.

## Akses endpoint domain yang sudah ada

| Method              | Route                        | Akses / catatan                                                                                          |
| ------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| GET                 | `/products`, `/products/:id` | Publik; query lama tetap berlaku.                                                                        |
| POST                | `/products/match`            | Publik; body filter lama tetap berlaku.                                                                  |
| POST, PATCH, DELETE | `/products`, `/products/:id` | Admin; POST hanya route koleksi.                                                                         |
| GET                 | `/wishlist`                  | Buyer, hanya milik sendiri.                                                                              |
| POST, DELETE        | `/wishlist/:productId`       | Buyer, hanya milik sendiri.                                                                              |
| POST                | `/orders`                    | Buyer; body `product_id`. Aturan transaksi belum diperbaiki.                                             |
| GET                 | `/orders/my`                 | Buyer, hanya milik sendiri.                                                                              |
| GET                 | `/orders/:id`                | Buyer pemilik atau Admin.                                                                                |
| GET                 | `/admin/orders`              | Admin.                                                                                                   |
| PATCH               | `/admin/orders/:id/status`   | Admin; status enum lama dan `tracking_number`. Transisi lengkap menyusul.                                |
| POST                | `/orders/:id/review`         | Buyer pemilik; `rating` bilangan bulat 1–5 dan `comment` tidak kosong. Aturan selesai/duplikat menyusul. |
| GET                 | `/reviews`                   | Publik; nama penulis tanpa email/ID akun.                                                                |

Alias tidak sengaja seperti `/api/:id` dan `/api/orders/admin/orders` dihapus.
ID valid yang tidak ditemukan menghasilkan `404`, termasuk edit/hapus produk dan hapus wishlist.
Filter string menolak array/objek; angka harga harus finite dan tidak negatif.
Pencarian diperlakukan sebagai teks literal, bukan ekspresi reguler dari pengguna.
PATCH produk hanya menerima field model lama dan menjalankan validator schema.

## Pengujian

Jalankan `npm test` dari `be`. Tes menggunakan HTTP sungguhan dan MongoDB sementara
terisolasi; tidak membaca `.env` atau database tim. Tes mencakup login Buyer/Admin,
eskalasi peran, email duplikat bersamaan, token, kepemilikan, validasi, route publik,
serta server yang gagal memulai karena konfigurasi/database tidak tersedia.
