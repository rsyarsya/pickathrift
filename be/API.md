# Kontrak API BE — batch 1–3

## Pencocokan, wishlist, dan alamat (batch 3)

`POST /api/products/match` publik mengganti body lama (`clothing_type`, `max_budget`)
dengan `category` wajib; `style`, `size`, `minPrice`, `maxPrice`, dan
`measurements: [{label, cm}]` opsional. Pilihan mengikuti produk/kategori; pengukuran
positif hingga 200 cm, tanpa label duplikat. Harga bilangan bulat rupiah tidak negatif,
min <= max. Field lama/asing ditolak 422. Hanya produk aktif dan available.
Semua ukuran yang diminta harus tersedia dan selisih <=2 cm. Respons `data` berupa
array `{product, diffCm}`; tanpa pengukuran diffCm=0. Urutan total selisih terkecil,
createdAt terbaru, lalu ID menurun. Hasil kosong tetap 200 dengan array kosong.

Wishlist tetap memakai GET `/api/wishlist` dan POST/DELETE `/api/wishlist/:productId`,
khusus Buyer sendiri. POST produk hilang/nonaktif 404; duplikat termasuk request
bersamaan 409. Produk Dipesan/Terjual boleh disimpan. GET mengembalikan item
`{id, productId, product_id, unavailable, createdAt}`. Produk aktif menggunakan DTO produk;
produk yang nonaktif/hilang menggunakan `product_id: null, unavailable: true`.
`productId` tetap tersedia untuk DELETE, termasuk produk yang kemudian tidak tersedia.

`address` pada registrasi opsional, GET/PATCH `/api/users/me`, dan respons auth
sekarang berupa null (belum diisi) atau objek lengkap
`{recipient, phone, street, city, postalCode}`. PATCH alamat mengganti seluruh objek;
null/string/objek parsial ditolak 422. Semua teks di-trim. Batas recipient/city 100,
street 1000; nomor Indonesia 08 sepanjang 10–13 digit, pemisah spasi/kurung/tanda
hubung dihapus; kode pos lima digit. Nama akun tetap terpisah dari penerima.
Nomor `phone` tingkat akun tetap field terpisah sesuai kontrak sebelumnya.
Alamat lama dipindah ke `legacy_address` internal melalui migrasi eksplisit; tidak
ditampilkan melalui API dan tidak dipakai checkout. Lihat MIGRATION.md.
Migrator melaporkan wishlist duplikat, pemilik bukan Buyer/hilang, serta produk
yang sudah hilang sebagai blocker sebelum unique index dipasang.

Baseline: `5c506d1`. Batch ini menangani akses, validasi dasar, dan respons galat.
Batch 2 melengkapi produk dan katalog berdasarkan FE di `185ee54`. Batch 3 melengkapi alamat terstruktur, wishlist dan pencocokan ukuran. Transaksi stok,
pembayaran, serta aturan ulasan lengkap masih menyusul.
BE secara keseluruhan belum siap produksi.

## Produk dan katalog (batch 2)

Produk sekarang menggunakan `name` (menggantikan `title`), `brand`, `category`, `size`,
`condition`, `style`, `color`, `price`, `images` (menggantikan `image_url`),
`measurements: [{label, cm}]`, `status`, `active`, `id`, `createdAt`, dan `updatedAt`.
`clothing_type` dihapus dari produk; jenis pakaian diwakili `category`.

| Method | Route                 | Akses  | Hasil                                                                          |
| ------ | --------------------- | ------ | ------------------------------------------------------------------------------ |
| GET    | `/products`           | Publik | `data: {items, total, counts, page, limit, totalPages}`. Hanya produk aktif.   |
| GET    | `/products/:id`       | Publik | Satu produk aktif; nonaktif/tidak ditemukan `404`.                             |
| GET    | `/admin/products`     | Admin  | Bentuk halaman sama; mencakup aktif/nonaktif.                                  |
| GET    | `/admin/products/:id` | Admin  | Detail termasuk produk nonaktif.                                               |
| POST   | `/products`           | Admin  | Input produk lengkap, `201`; selalu Tersedia dan aktif.                        |
| PATCH  | `/products/:id`       | Admin  | Sebagian field produk atau `active` boolean; hasil produk setelah perubahan.   |
| DELETE | `/products/:id`       | Admin  | Menetapkan `active: false`, tanpa menghapus dokumen atau mengubah status stok. |

Input POST wajib: `name`, `brand`, `category`, `size`, `condition`, `style`, `price`,
`images`. `color` default string kosong; `measurements` default array kosong.
PATCH menerima field yang sama dan `active`; menolak field lain, termasuk ID, waktu,
operator MongoDB, dan status stok. Harga bilangan bulat rupiah minimal 1000.
Nama maksimal 200 karakter, merek 100, warna 100. Nilai teks di-trim.

- Kategori: Jaket, Kaos, Kemeja, Celana. Gaya: Kasual, Workwear, Vintage, Formal.
- Kondisi mengikuti empat pilihan FE: Baru dengan tag, Sangat baik, Baik, Memuaskan.
- Ukuran atasan: XS/S/M/L/XL; Celana: 27/28/29/30/31/32/33/34/36 (string).
- Foto 1–4 referensi HTTP(S) atau path publik lokal absolut (`/images/...`), urutan
  pertama adalah foto utama. Data URL, Blob URL, dan path file komputer ditolak.
  Upload fisik lokal akan ditambahkan pada batch berkas; validasi ini belum memeriksa isi foto.
- Pengukuran opsional, tidak boleh ada label duplikat. Nilai harus angka `>0` dan `<=200` cm.
  Atasan: Lebar dada, Panjang, Bahu, Lengan. Celana: Pinggang, Panjang, Lebar paha, Lebar bawah.
  Perubahan kategori wajib menghasilkan ukuran dan pengukuran yang valid untuk kategori baru.
- Produk Terjual menolak semua edit. Produk Dipesan menolak perubahan harga/ukuran label
  dan penonaktifan (`409`); pengiriman ulang nilai harga/ukuran yang sama diperbolehkan.
  Hanya produk Tersedia boleh diaktifkan/dinonaktifkan. Konflik perubahan bersamaan `409`.

Query katalog memakai nama properti `CatalogQuery` FE, bukan nama parameter URL halaman FE:

| Parameter              | Aturan                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `q`                    | Pencarian substring nama atau merek, tidak peka huruf besar/kecil, teks literal.                                |
| `category`             | Satu kategori valid.                                                                                            |
| `sizes`, `conditions`  | CSV atau parameter berulang; OR dalam satu filter, AND antar filter. Ukuran Celana didukung.                    |
| `minPrice`, `maxPrice` | Angka finite tidak negatif; batas inklusif dan min tidak boleh melebihi max.                                    |
| `availableOnly`        | `true/false`, default `false`; default mencakup Tersedia, Dipesan, Terjual.                                     |
| `sort`                 | `terbaru` (default), `termurah`, `termahal`. Harga sama diurutkan terbaru, kemudian ID sebagai pembeda.         |
| `page`, `limit`        | Bilangan bulat positif; default 1 dan 12, limit maksimal 100. Halaman melewati hasil menghasilkan items kosong. |
| `status`, `active`     | Hanya pada daftar Admin: filter status stok dan boolean aktif. Tanpa filter mencakup semua.                     |

`total` menghitung hasil semua filter sebelum pagination. `counts` berisi Semua/Jaket/Kaos/
Kemeja/Celana tanpa filter pencarian dan filter lain; publik hanya menghitung produk aktif,
Admin menghitung seluruh produk. Parameter asing/berulang yang tidak didukung menghasilkan `422`.
Nama query lama seperti `search`, `min_price`, dan `price_asc` tidak lagi diterima.
Urutan `terbaru` pada daftar Admin memakai waktu edit (`updatedAt`), mengikuti FE Admin;
katalog publik memakai waktu penambahan (`createdAt`).

Kontrak lengkap `POST /products/match` sekarang mengikuti bagian batch 3 di atas.

Pesanan baru menyimpan `product_snapshot`. Respons `product_id` pesanan memakai salinan
tersebut, sehingga edit/penonaktifan produk tidak mengubah informasi riwayatnya.
Pesanan lama tanpa salinan perlu migrasi sebelum startup. Respons menambahkan
`product_snapshot_source`: `checkout` untuk pesanan baru atau `legacy-current-product`
untuk salinan berdasarkan data saat migrasi; lihat [MIGRATION.md](MIGRATION.md).
Pemesanan produk nonaktif ditolak. Transaksi dan pemulihan stok tetap masuk batch 4.
Tidak ada migrasi database tim otomatis. Startup menolak data yang belum kompatibel
dan mengarahkan ke dry-run `migrate:legacy`; tidak ada fallback yang menebak ukuran,
foto, atau kondisi. Apply hanya dijalankan secara eksplisit, bukan saat startup.

## Aturan umum

- Base URL lokal: `http://localhost:5000/api`.
- JSON sukses: `{ "success": true, "data": ... }`; bentuk `data` dijelaskan per endpoint.
- JSON galat: `{ "success": false, "code": "...", "message": "...", "errors"?: {...} }`.
- Data menggunakan `id` string, tanpa `_id`, `__v`, hash sandi, atau dokumen database mentah.
  Field domain lama seperti `product_id` tetap dipakai sampai batch domain terkait.
- Route privat membutuhkan `Authorization: Bearer <token>`.
- `401`: token hilang/salah/kedaluwarsa, akun sudah dihapus, atau kredensial salah.
  `403`: peran salah atau bukan pemilik data. `404`: resource tidak ada.
  `409`: duplikat/konflik. `422`: input atau ID bukan ObjectId 24 karakter heksadesimal.
- JSON rusak menghasilkan `422`; body terlalu besar `413`; encoding/charset tidak didukung
  menghasilkan `415 UNSUPPORTED_MEDIA_TYPE`; galat internal tidak memuat detail database.
- Token Buyer berlaku 24 jam dan Admin 2 jam. Peran diambil ulang dari database pada setiap
  request privat. Belum ada endpoint pencabutan token/logout server.

## Auth dan profil

| Method | Route            | Akses      | Body / hasil                                                                                                               |
| ------ | ---------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/register` | Publik     | `name`, `email`, `password`; opsional `confirmPassword`, `phone`, `address`. Hasil `201`, `data` pengguna Buyer.           |
| POST   | `/auth/login`    | Publik     | `email`, `password`, opsional `role: buyer/admin` untuk memeriksa halaman masuk yang dipilih. Hasil `data: {token, user}`. |
| GET    | `/users/me`      | Akun aktif | `data` profil akun dari token.                                                                                             |
| PATCH  | `/users/me`      | Akun aktif | Hanya `name`, `phone`, `address`; minimal satu field. `address` mengikuti objek lengkap pada bagian batch 3.               |

Email di-trim dan dijadikan huruf kecil. Nama tidak kosong, maksimal 100 karakter; email
maksimal 254 karakter dengan format `nama@domain.tld`. Sandi registrasi minimal 8 karakter
dan maksimal 72 byte UTF-8 (batas bcrypt); sandi tidak di-trim. Login tidak memaksakan
minimal 8 karakter agar kredensial lama tetap dapat diperiksa. `confirmPassword`, bila
dikirim, harus cocok. Field `role` saat registrasi diabaikan: hasil selalu Buyer.
Registrasi duplikat, termasuk request bersamaan, menghasilkan `409 EMAIL_EXISTS`.
`phone` akun maksimal 30 karakter. Aturan alamat mengikuti bagian batch 3.
PATCH profil tidak menerima email, password, role, ID, ataupun operator MongoDB.

## Akses endpoint domain yang sudah ada

| Method              | Route                        | Akses / catatan                                                                                          |
| ------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| GET                 | `/products`, `/products/:id` | Publik; kontrak batch 2 di atas.                                                                         |
| POST                | `/products/match`            | Publik; body pencocokan batch 3.                                                                         |
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
Filter tunggal menolak array/objek; `sizes` dan `conditions` mendukung nilai berulang.
Angka harga harus finite dan tidak negatif.
Pencarian diperlakukan sebagai teks literal, bukan ekspresi reguler dari pengguna.
PATCH produk mengikuti validasi dan pembatasan batch 2.

## Pengujian

Jalankan `npm test` dari `be`. Tes menggunakan HTTP sungguhan dan MongoDB sementara
terisolasi; tidak membaca `.env` atau database tim. Tes mencakup login Buyer/Admin,
eskalasi peran, email duplikat bersamaan, token, kepemilikan, validasi, route publik,
serta server yang gagal memulai karena konfigurasi/database tidak tersedia.
