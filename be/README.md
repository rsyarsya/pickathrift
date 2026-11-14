# Backend PickaThrift

Express 5, MongoDB, JavaScript CommonJS; Node.js 22 atau lebih baru.
Perbaikan dikerjakan bertahap. Batch 1 mencakup akses, validasi dasar, dan tes;
batch 2 melengkapi model produk, aturan edit Admin, dan katalog dengan pagination.
Pencocokan ukuran, transaksi stok, pembayaran, serta aturan domain lengkap belum selesai.

## Menjalankan lokal

1. Dari direktori `be`, jalankan `npm ci`.
2. Buat `be/.env` lokal, isi `MONGODB_URI`, `JWT_SECRET` (rahasia acak milikmu),
   dan opsional `PORT` (default 5000). Jangan commit file tersebut.
3. Jalankan `npm start` atau `npm run dev` untuk memuat ulang saat kode berubah.

Server baru menerima request setelah MongoDB terhubung dan indeks unik email siap.
Konfigurasi tidak lengkap atau koneksi gagal menghentikan startup dengan exit code 1.
Tidak ada perubahan otomatis terhadap data akun lama. Akun lama dengan email tidak
dinormalisasi perlu ditinjau sebelum menggunakan database bersama.
Model produk berubah dari `title/image_url` menjadi `name/images` dan data sesuai FE.
Tidak ada migrasi otomatis untuk produk atau pesanan lama; detail perubahan ada di API.md.

## Membuat Admin

Isi `ADMIN_NAME`, `ADMIN_EMAIL`, dan `ADMIN_PASSWORD` melalui environment shell lokal
atau `be/.env`, lalu jalankan `npm run admin:create`. Gunakan database lokal terlebih dahulu.
Perintah membuat akun baru; email yang sudah terdaftar ditolak tanpa mengubah peran akun lama.
Sandi tidak ditampilkan di log atau diberikan sebagai argumen perintah.

## Memeriksa perubahan

- `npm test`: tes HTTP dengan MongoDB replica set sementara; tidak menggunakan `.env`
  atau database tim. Eksekusi pertama mengunduh binary MongoDB 8.2.6 ke cache lokal.
- `npm run lint`: pemeriksaan JavaScript BE.
- `npm run format:check`: pemeriksaan format BE tanpa menulis ulang berkas.

Kontrak route, respons, perubahan dari BE lama, dan batas batch tersedia di [API.md](API.md).
Tidak ada build/transpilasi atau pemeriksaan TypeScript karena BE menggunakan JavaScript.
