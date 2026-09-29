# Memori Proyek PickaThrift

## Ringkasan produk

PickaThrift adalah web store untuk satu usaha thrift, bukan marketplace multi-penjual. Produk ditujukan terutama untuk Gen Z dan dewasa muda. Antarmuka harus ringan, responsif, mudah dipahami, dan cepat digunakan. Masalah utama yang diselesaikan adalah informasi produk dan pesanan yang tersebar serta persaingan beberapa pembeli atas satu barang unik.

Laporan akhir Milestone 1 adalah sumber utama. Jika catatan lama bertentangan dengan laporan tersebut, ikuti laporan akhir Milestone 1.

## Peran dan aturan bisnis

- `Buyer` mencari, menyimpan, membandingkan, memesan, dan mengulas produk.
- `Admin` mengelola produk, ketersediaan, serta seluruh pesanan Buyer.
- Setiap produk unik dan selalu berjumlah satu unit.
- Status ketersediaan minimal mencakup `available`, `reserved`, dan `sold` (padanan tampilan: Tersedia, Dipesan, dan Terjual).
- Reservasi/pembelian harus atomik sehingga hanya satu Buyer yang berhasil mendapatkan produk.
- Wishlist dan Meja Perbandingan tidak mereservasi produk.
- Buyer hanya boleh mengakses pesanannya sendiri.
- Ulasan hanya boleh dibuat oleh pemilik pesanan setelah pesanan berstatus selesai.
- Hanya Admin yang boleh mengelola produk dan seluruh pesanan.
- Kata sandi dan kredensial sensitif wajib disimpan secara aman, termasuk hashing kata sandi.
- Semua masukan harus divalidasi dan kegagalan harus menghasilkan respons galat yang jelas.

## Ruang lingkup

### Must

- F-01 katalog, pencarian, filter, pengurutan, dan status ketersediaan.
- F-02 detail produk lengkap, termasuk ukuran pakaian dalam sentimeter.
- F-03 registrasi/login Buyer dan Admin serta akses berbasis peran.
- F-04 wishlist Buyer.
- F-05 Buy Now, alamat, ongkir tetap MVP, transfer manual, dan unggah bukti pembayaran.
- F-06 reservasi atomik untuk stok tunggal.
- F-07 riwayat dan status pesanan Buyer.
- F-08 rating dan ulasan setelah pesanan selesai.
- F-09 CRUD produk oleh Admin.
- F-10 pengelolaan pesanan oleh Admin.
- F-11 Cari yang Cocok berdasarkan jenis, gaya, ukuran label, anggaran, dan ukuran pakaian opsional.
- F-12 Meja Perbandingan untuk maksimal dua produk sejenis; perbandingan dilakukan di frontend dari data detail produk.

### Should (ruang lingkup mendatang)

- S-01 payment gateway sandbox.
- S-02 timer reservasi 15 menit.
- S-03 keranjang untuk beberapa produk.
- S-04 Blindbox yang dirakit Admin.

### Could (ruang lingkup mendatang)

- Diskon dan pengurutan berdasarkan popularitas wishlist.
- Catatan serta foto cacat terperinci.
- Google OAuth dan API ongkos kirim.
- Indikator minat dan dasbor Admin.
- Eco CO2 Tracker dan AI Outfit Planner.

Jangan mengimplementasikan fitur Should atau Could sebelum seluruh fitur Must dan keputusan tim yang terkait sudah jelas.

## Kontrak API Milestone 1

Kontrak rancangan berisi 20 endpoint:

- Autentikasi/profil: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/users/me`, `PATCH /api/users/me`.
- Produk: `GET /api/products`, `GET /api/products/:id`, `POST /api/products`, `PATCH /api/products/:id`, `DELETE /api/products/:id`.
- Cari yang Cocok: `POST /api/products/match`.
- Wishlist: `GET /api/wishlist`, `POST /api/wishlist/:productId`, `DELETE /api/wishlist/:productId`.
- Pesanan: `POST /api/orders`, `GET /api/orders/my`, `GET /api/orders/:id`, `GET /api/admin/orders`, `PATCH /api/admin/orders/:id/status`.
- Ulasan: `POST /api/orders/:id/review`, `GET /api/reviews`.

Perlakukan daftar tersebut sebagai kontrak desain Milestone 1. Jika implementasi berbeda, dokumentasikan perbedaan yang bermakna; jangan mengubah kontrak diam-diam.

## Catatan teknis yang diketahui

Temuan berikut berasal dari pengujian Postman sebelumnya dan belum terbukti diperbaiki di kode:

1. Ulasan pernah dapat dibuat saat pesanan masih berstatus `shipped`; seharusnya hanya saat `completed`.
2. `GET /api/reviews` pernah bertabrakan dengan rute detail Order sehingga `reviews` diperlakukan sebagai ObjectId pesanan.
3. Endpoint ulasan publik pernah meminta autentikasi, padahal kontraknya publik.
4. `GET /api/wishlist` tanpa token pernah menghasilkan `404`; respons yang dimaksud adalah `401`. Temuan ini masih perlu dikonfirmasi setelah rute stabil.

Jangan menyatakan temuan tersebut telah diperbaiki tanpa bukti dari kode dan pengujian.

## Batasan rubrik Regular Mode

- Backend wajib menggunakan ExpressJS dan MongoDB.
- Frontend wajib menggunakan React atau Next.js. Pilihan antara keduanya masih menunggu keputusan tim.
- Bobot: Umum 35%, Backend 30%, Frontend 30%, Tambahan 5%.
- Di dalam bagian Umum: G1 ketepatan fitur 35%, G2 kontribusi 30%, G3 alur pengembangan 10%, G4 presentasi 15%, dan G5 video maksimal 10 menit 10%.
- Di dalam bagian Backend: BE1 ExpressJS 20%, BE2 MongoDB 20%, BE3 CRUD 30%, BE4 hashing 10%, BE5 proteksi API/otorisasi 10%, dan BE6 ketepatan waktu 10%.
- Di dalam bagian Frontend: FE1 struktur React/Next.js 10%, FE2 kesesuaian dan responsivitas desain 20%, FE3 best practices 20%, FE4 interaktivitas 10%, FE5 konsumsi API/validasi/galat 30%, dan FE6 ketepatan waktu 10%.
- Maksimal dua integrasi pihak ketiga dapat diakui sebagai nilai tambah.

## Organisasi monorepo

- `apps/frontend/`: aplikasi React atau Next.js setelah keputusan dibuat.
- `apps/backend/`: API ExpressJS dan integrasi MongoDB.
- `docs/`: indeks dokumentasi dan tautan laporan proyek.
- Konfigurasi workspace, package manager, CI, Docker, lisensi, dan kerangka pengujian belum dipilih. Jangan menambahkannya tanpa keputusan atau kebutuhan implementasi yang nyata.

## Keputusan yang sudah dikonfirmasi

- FE dan BE berada dalam satu monorepo.
- Branch default adalah `main`; belum ada strategi branching atau workflow Git yang disepakati.
- Rasyadwa Arsya Irnantyanto adalah Project Manager dan juga mendukung frontend serta backend.
- Produk adalah web store satu usaha thrift dengan dua peran: Buyer dan Admin.
- Kontrak API dan prioritas Must/Should/Could mengikuti Milestone 1.

## Keputusan yang masih menunggu

- Pilihan React atau Next.js.
- Package manager dan konfigurasi workspace monorepo.
- Pembagian peran tiga anggota selain Rasyadwa.
- Strategi branching dan workflow Git.
- Pilihan layanan deployment, penyimpanan berkas, dan integrasi pihak ketiga.

## Aturan kerja agen

- Periksa kode, manifest, lockfile, skrip, struktur, dan instruksi yang ada sebelum mengubah arsitektur.
- Pertahankan pekerjaan valid yang sudah ada dan hindari pemindahan berkas secara membabi buta.
- Jangan mengarang fitur selesai, perintah, variabel lingkungan, cakupan tes, atau URL deployment.
- Jangan commit kredensial, token, kunci privat, URI basis data, `.env`, dependensi, hasil build, log, cache, atau berkas hasil generasi yang tidak diperlukan.
- Hanya commit `.env.example` yang berisi placeholder aman ketika variabelnya benar-benar digunakan oleh aplikasi.
- Jalankan validasi, lint, test, dan build yang memang tersedia sebelum commit. Dokumentasikan keterbatasan bila aplikasi belum dapat dijalankan.
