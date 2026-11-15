# Backend PickaThrift

Express 5, MongoDB, JavaScript CommonJS; Node.js 22 atau lebih baru.
Perbaikan dikerjakan bertahap. Batch 1 mencakup akses, validasi dasar, dan tes;
batch 2 melengkapi model produk, aturan edit Admin, dan katalog dengan pagination.
Pencocokan ukuran, transaksi stok, pembayaran, serta aturan domain lengkap belum selesai.

## Menjalankan lokal

1. Dari root repository, jalankan `pnpm install --frozen-lockfile` dengan pnpm 12.3.4.
2. Buat `be/.env` lokal, isi `MONGODB_URI`, `JWT_SECRET` (rahasia acak milikmu),
   dan opsional `PORT` (default 5000). Jangan commit file tersebut.
3. Jalankan `pnpm --filter @pickathrift/be start` atau `pnpm --filter @pickathrift/be dev`.

pnpm adalah alur utama workspace FE/BE. `be/package-lock.json` tetap mendukung instalasi
BE mandiri dengan `npm ci`; jika dependensi BE berubah, sinkronkan kedua lockfile.

Server baru menerima request setelah MongoDB terhubung dan indeks unik email siap.
Konfigurasi tidak lengkap atau koneksi gagal menghentikan startup dengan exit code 1.
Startup hanya membaca pemeriksaan data lama; jika belum kompatibel, server berhenti
sebelum menerima request dan menunjukkan perintah migrasi. Database baru tidak perlu migrasi.
Panduan migrasi tersedia di [MIGRATION.md](MIGRATION.md). Tidak ada reset database otomatis.

## Membuat Admin

Isi `ADMIN_NAME`, `ADMIN_EMAIL`, dan `ADMIN_PASSWORD` melalui environment shell lokal
atau `be/.env`, lalu jalankan `pnpm --filter @pickathrift/be admin:create`. Gunakan database lokal terlebih dahulu.
Perintah membuat akun baru; email yang sudah terdaftar ditolak tanpa mengubah peran akun lama.
Sandi tidak ditampilkan di log atau diberikan sebagai argumen perintah.

## Memeriksa perubahan

- `pnpm --filter @pickathrift/be test`: tes HTTP dengan MongoDB replica set sementara; tidak menggunakan `.env`
  atau database tim. Eksekusi pertama mengunduh binary MongoDB 8.2.6 ke cache lokal.
- `pnpm --filter @pickathrift/be lint`: pemeriksaan JavaScript BE.
- `pnpm --filter @pickathrift/be format:check`: pemeriksaan format BE tanpa menulis ulang berkas.

Kontrak route, respons, perubahan dari BE lama, dan batas batch tersedia di [API.md](API.md).
Tidak ada build/transpilasi atau pemeriksaan TypeScript karena BE menggunakan JavaScript.
