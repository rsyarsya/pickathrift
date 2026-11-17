# Deployment PickaThrift

## Target Vercel: BE dahulu, lalu FE

Buat dua project dari repository yang sama, branch production `main`:

| Project         | Root Directory | Framework | Node |
| --------------- | -------------- | --------- | ---- |
| pickathrift-api | `be`           | Express   | 22.x |
| pickathrift-web | `fe`           | Next.js   | 22.x |

Konfigurasi install/build ada di masing-masing `vercel.json`. Output directory mengikuti
framework; `npm start` bukan build command. `.vercel/` dan env tetap lokal.
BE mengekspor Express melalui `app.js`; request pertama menghubungkan database dan memeriksa
replica set, data, indeks, serta bucket private. Request bersamaan berbagi inisialisasi;
request berikutnya memakai ulang pool. Kegagalan awal menghasilkan 503 dan dicoba lagi.

1. Isi env BE dari tabel di bawah, termasuk `STORAGE_DRIVER=supabase` dan key sandbox.
   FRONTEND_URL sementara boleh `http://localhost:3000`; setelah FE live gunakan origin HTTPS FE.
   Pilih `TRUST_PROXY=1` dan verifikasi pembatasan login pada deployment.
2. Izinkan koneksi Vercel di Atlas. Vercel biasa tidak menyediakan IP egress tetap. Untuk demo
   Free, akses list `0.0.0.0/0` memungkinkan koneksi dari seluruh IP; autentikasi database tetap
   wajib. Gunakan user khusus dengan akses database `pickathrift` dan password kuat.
   [Panduan Atlas/Vercel](https://www.mongodb.com/docs/atlas/reference/partner-integrations/vercel/).
3. Deploy BE; pastikan `/` dan `/api/products` menjawab 200. URL produksi API harus dapat diakses
   tanpa Vercel Authentication agar browser Buyer dan webhook Midtrans dapat menghubunginya.
4. Isi env FE sebelum build: NEXT_PUBLIC_API_URL = origin HTTPS BE tanpa `/api`, dan
   NEXT_PUBLIC_GOOGLE_CLIENT_ID = Client ID yang sama dengan BE. Build Vercel menolak API
   localhost/HTTP agar FE tidak menunjuk komputer pengunjung.
5. Deploy FE. Ubah FRONTEND_URL BE menjadi origin produksi FE lalu redeploy BE.
6. Tambahkan origin FE ke Google OAuth Authorized JavaScript origins. Pasang URL BE
   `/api/payments/midtrans/notification` di dashboard sandbox Midtrans dan env override bila dipakai.
7. Uji Google Login, foto, VA/QRIS, webhook, dan status stok pada domain final.

FE mengirim satu foto per request, maksimal 2 MiB, dengan urutan hingga empat foto tetap sama.
Ini menghindari [batas payload Vercel 4,5 MB](https://vercel.com/docs/functions/limitations).
Jika upload berikutnya gagal, foto sebelumnya mungkin sudah tersimpan tanpa terkait produk;
form menampilkan galat dan tidak menyimpan produk otomatis. Penghitung rate limit masih
per instance, bukan penghitung global lintas instance serverless. Driver local tetap tersedia
untuk pengembangan; Vercel wajib Supabase karena disk sementara dan express.static tidak dilayani.

Gunakan Node.js 22 atau lebih baru. Frontend menjalankan Next.js server dan backend
menjalankan Express; keduanya bukan situs statis. Pembayaran saat ini khusus Midtrans
sandbox, untuk demo tanpa uang sungguhan.

## Build dan start

Jalankan `pnpm install --frozen-lockfile` dari root repository memakai versi pnpm pada
`packageManager`. Siapkan variabel FE sebelum build karena `NEXT_PUBLIC_*` ditanam
ke JavaScript hasil build.

| Service | Build                                 | Start                                 |
| ------- | ------------------------------------- | ------------------------------------- |
| FE      | `pnpm --filter @pickathrift/fe build` | `pnpm --filter @pickathrift/fe start` |
| BE      | Tidak membutuhkan transpilasi         | `pnpm --filter @pickathrift/be start` |

FE membaca `PORT` hosting; default 3000. BE membaca `PORT`; default 5000. Pada hosting
dengan direktori service terpisah, pastikan instalasi tetap mencakup lockfile workspace.
BE juga dapat diinstal mandiri dengan `npm ci` di `be/`.

## Konfigurasi hosting

Masukkan nilai rahasia melalui pengaturan environment hosting. `.env` dan seluruh
contohnya tetap lokal, tidak dimasukkan ke Git.

| Service | Variabel                       | Kebutuhan                                                                                                                |
| ------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| FE      | `NEXT_PUBLIC_API_URL`          | Origin HTTPS BE, tanpa akhiran `/api`. Wajib diisi sebelum build; fallback localhost hanya untuk lokal.                  |
| FE      | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Wajib untuk demo tim. Harus sama dengan Client ID BE dan mengizinkan origin FE pada Google Cloud.                        |
| BE      | `NODE_ENV`                     | `production`                                                                                                             |
| BE      | `MONGODB_URI`                  | MongoDB replica set atau Atlas, dengan kredensial dan akses jaringan untuk service BE.                                   |
| BE      | `JWT_SECRET`                   | Rahasia acak panjang, berbeda dari data uji.                                                                             |
| BE      | `FRONTEND_URL`                 | Origin HTTPS FE untuk tujuan kembali dari Snap.                                                                          |
| BE      | `MIDTRANS_ENABLED`             | `true` untuk checkout sandbox. Jika false, checkout baru ditolak.                                                        |
| BE      | `MIDTRANS_SERVER_KEY`          | Server Key API sandbox. Tidak pernah memakai prefix `NEXT_PUBLIC_`.                                                      |
| BE      | `MIDTRANS_NOTIFICATION_KEY`    | Key utama/default penanda tangan notifikasi dan penutupan Snap, jika berbeda dari key API.                               |
| BE      | `MIDTRANS_NOTIFICATION_URL`    | Opsional: URL HTTPS publik `/api/payments/midtrans/notification`. Tanpa override, set URL tersebut di dashboard sandbox. |
| BE      | `STORAGE_DRIVER`               | `supabase` untuk deployment ini; default `local` untuk pengembangan/tes.                                                 |
| BE      | `SUPABASE_URL`                 | Origin HTTPS project Supabase.                                                                                           |
| BE      | `SUPABASE_SECRET_KEY`          | Secret key server berawalan `sb_secret_`; hanya di BE.                                                                   |
| BE      | `SUPABASE_STORAGE_BUCKET`      | Nama bucket private, misalnya `pickathrift-assets`.                                                                      |
| BE      | `UPLOAD_DIR`                   | Hanya untuk driver local; membutuhkan disk persisten bila dipakai di hosting.                                            |
| BE      | `GOOGLE_CLIENT_ID`             | Wajib untuk demo tim yang memakai Google Login; isi sama dengan Client ID FE.                                            |
| BE      | `TRUST_PROXY`                  | Jumlah hop reverse proxy yang benar, 0–5. Default tidak mempercayai header proxy.                                        |

`TRUST_PROXY=1` hanya cocok bila seluruh request memang melalui satu reverse proxy
terpercaya. Sesuaikan dengan topologi hosting; nilai yang salah dapat membuat semua
pengunjung berbagi pembatasan login atau mempercayai alamat IP kiriman klien.
Lihat [panduan Express](https://expressjs.com/en/guide/behind-proxies/).

Login password dan Google berbagi batas 20 respons gagal per IP dalam 15 menit.
Login berhasil tidak menghabiskan batas tersebut. Registrasi dibatasi 30 request per
IP dalam 15 menit. Respons pembatasan adalah `429 RATE_LIMITED` dengan `Retry-After`.
Penghitung berada di memori satu proses; jika menjalankan beberapa instance, gunakan
store pembatasan bersama atau pembatasan di reverse proxy. Mode `test` melewati batas
untuk tes alur; pengujian pembatasan sendiri memakai mode production.

## Penyimpanan dan database

Untuk deployment ini, gunakan Supabase Storage dengan satu bucket **private**.
BE menyimpan foto pada prefix `products/` dan bukti manual lama pada `proofs/`.
URL produk tetap melalui BE; bukti tetap memerlukan JWT aplikasi dan akses pemilik/Admin.
Bucket tidak memerlukan policy akses publik. Key Supabase hanya di server. JWT aplikasi
tetap memakai `JWT_SECRET`; `SUPABASE_JWKS_URL` tidak digunakan untuk Storage ini.

Startup memeriksa akses dan privasi bucket. File baru tetap tersedia setelah restart/redeploy
karena tidak bergantung pada disk hosting. Driver `local` tersedia untuk tes/pengembangan;
driver Supabase tidak memakai file lokal sebagai cadangan jika layanan cloud gagal.
Sebelum memindahkan database lama ke driver Supabase, salin isi folder lokal `products/`
dan `proofs/` ke prefix yang sama pada bucket, dengan nama file tetap. Tidak ada migrasi
atau penghapusan file lama otomatis. Perintah admin dan dry-run migrasi mengikuti driver terpilih.

Startup BE memeriksa replica set, indeks unik, dan kompatibilitas data. Untuk database
lama, jalankan pemeriksaan di [panduan migrasi](../be/MIGRATION.md) pada salinan database
lebih dahulu. Akun Admin dibuat sekali dengan perintah `admin:create` dan kredensial
yang disiapkan pengelola; tidak ada akun Admin bawaan.

## Pemeriksaan sebelum mengumumkan URL

1. Jalankan `pnpm lint`, `pnpm typecheck`, `pnpm test`, build FE, serta tes browser.
2. Pastikan browser menghubungi domain BE yang benar dan foto hasil upload tampil.
3. Uji Buyer mendaftar, login, menyimpan alamat, wishlist, serta checkout dari URL FE.
4. Bayar satu VA dan satu QRIS melalui simulator Midtrans. Periksa webhook 200,
   status Diproses, dan stok Terjual; jangan menyimpulkan sukses dari query callback.
5. Uji pembatalan dan dua Buyer yang memesan barang sama. Periksa jumlah order dan stok.
6. Jalankan pengiriman Admin, penerimaan Buyer, serta ulasan.
7. Restart/redeploy service BE dan pastikan produk, akun, pesanan, serta foto yang
   diunggah tetap dapat dibaca. Periksa domain Google bila fitur itu diaktifkan.

Kesehatan proses BE dapat diperiksa melalui `GET /`. Ini pemeriksaan service hidup;
koneksi dan persistensi database tetap perlu diperiksa melalui alur di atas.
