# Deployment PickaThrift

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
| BE      | `UPLOAD_DIR`                   | Direktori pada disk persisten, dapat ditulis BE.                                                                         |
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

Foto produk serta bukti manual lama disimpan di disk BE. Dependensi Supabase yang
ada di manifest belum dipakai untuk menyimpan file. Hosting dengan disk sementara
dapat kehilangan upload setelah restart/redeploy meskipun referensinya tetap di MongoDB.
Sediakan disk persisten dan backup `UPLOAD_DIR` bersama database, atau implementasikan
penyimpanan objek sebelum memilih hosting yang hanya menyediakan disk sementara.

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
