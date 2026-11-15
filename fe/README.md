# Frontend PickaThrift

Next.js (App Router), TypeScript, Tailwind CSS 4, Vitest. Semua layar Buyer (B1–B9), Admin
(M1–M4), auth (A1–A3), dan state sistem (X1) sudah ada.

Katalog, pencocokan ukuran, wishlist, profil, checkout, pesanan, ulasan, dan Admin
menggunakan API backend. Meja Perbandingan disimpan di browser.

## Menjalankan

```powershell
pnpm install
pnpm --filter @pickathrift/be dev
# Di terminal lain
pnpm --filter @pickathrift/fe dev
```

`pnpm install` hanya perlu saat setup pertama atau setelah dependensi berubah.
Buka http://localhost:3000.

Sebelum push: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check` dari root.

## Autentikasi dengan backend

Jalankan backend dengan konfigurasi lokal MongoDB dan JWT dari tim. Frontend menggunakan
`NEXT_PUBLIC_API_URL=http://localhost:5000` (juga URL bawaan). Berkas `.env` tetap lokal.

Form `/daftar`, `/masuk`, dan `/admin/masuk` memanggil API sebenarnya. Registrasi menyimpan
akun buyer ke database, lalu pengguna masuk melalui halaman login. Admin memakai akun yang
sudah disiapkan pengelola backend. Kredensial fiktif pada tes tidak berlaku sebagai akun database.

JWT berada di `sessionStorage` pada tab yang sama, dikirim melalui header Bearer, dan sesi
diverifikasi melalui `/api/users/me` saat refresh. Logout menghapus token dan sesi lokal.
Data sesi simulasi lama di localStorage diabaikan; flag simulasi tidak mengendalikan form lagi.
Lihat [panduan integrasi autentikasi](../docs/auth-integration.md) untuk konfigurasi dan pengujian.

## Struktur

```text
fe/
├── public/              # gambar dan aset statis
├── src/
│   ├── app/             # rute. Halaman tipis: pilih modul, render layarnya
│   ├── components/
│   │   ├── ui/          # Button, Input, Select, dan sejenisnya
│   │   └── layout/      # Navbar, Footer, kerangka halaman
│   ├── hooks/
│   ├── lib/             # cn.ts, env.ts, helper yang dipakai lintas modul
│   ├── modules/         # satu folder per bagian produk, isi: components/ dan data/
│   └── styles/          # globals.css, tempat semua token desain
```

Aturannya: file di `src/app` tetap tipis. Isi layar tinggal di `src/modules/<bagian>`, supaya
rute tidak tumbuh jadi file ribuan baris.

## Token desain

`src/styles/globals.css` menyalin board "Foundation" dari
[Figma PAW Web Thrift Store](https://www.figma.com/design/gQDkE51UKJuWZkLBZsjpX9/PAW-Web-Thrift-Store?node-id=0-1).
Warna, radius, shadow, dan skala spasi sudah persis. Ukuran teks masih perkiraan dari render
dan perlu dicocokkan saat layar pertama digarap.

Jangan menulis hex mentah di komponen. Pakai nama tokennya: `text-fg`, `bg-canvas`,
`text-brand`, `bg-success-bg`, `rounded-lg`, `shadow-card`.

Satu langkah spasi = satu piksel desain, jadi `space-4` di Figma ditulis `p-16` di kode.

### Gerak dan fokus (DS-009)

Hanya ada tiga jenis respons. Jangan menambah durasi atau efek baru per komponen.

| Elemen                      | Kelas                                            | Respons                                                |
| --------------------------- | ------------------------------------------------ | ------------------------------------------------------ |
| Tombol, chip, tombol ikon   | `press` (sudah ada di `Button` dan `Chip`)       | warna berubah, mengecil 98% saat ditekan, 150 ms       |
| Foto yang bisa diklik       | `photo-zoom` pada gambar, `group` pada tautannya | zoom 3% di dalam bingkai, 200 ms; teks dan tombol diam |
| Area drop (tray Bandingkan) | `transition-colors duration-200`                 | warna latar dan garis saja                             |

Fokus keyboard memakai garis merah 3 px dari `:focus-visible`; jangan dihapus. Semua gerak
skala mati otomatis kalau pengguna memilih kurangi gerakan. Efek scroll cukup tiga yang
sudah ada (foto hero, logo footer, Lenis): tanpa autoplay, parallax tambahan, atau animasi
muncul di setiap section. Token durasinya `--motion-control` dan `--motion-photo` di
`globals.css`.

## Layar di Figma

45 frame desktop 1440, bernomor `01-beranda` sampai `45-lanjutan-admin-dashboard`.
Nomor 41–45 bertanda "lanjutan" dan masuk lingkup Should/Could, bukan Milestone 1.

Nama rute mengikuti nama frame, dalam bahasa Indonesia: `/katalog`, `/produk/[id]`,
`/wishlist`, `/meja-perbandingan`, `/pesanan`, `/admin/produk`.

## Data

Panggilan backend dilakukan lewat fungsi di `src/modules/*/data/` dan klien bersama
`src/lib/api.ts`. Klien menambahkan token Bearer, menangani respons API, dan meneruskan
`ApiError` agar layar bisa membedakan masalah jaringan, akses ditolak, dan konflik stok.
Bukti bayar diambil dengan autentikasi dan ditampilkan melalui blob URL.

API menyimpan profil, alamat, wishlist, pesanan, ulasan, dan produk. Meja Perbandingan
menyimpan ID barang di `localStorage` (`pickathrift.compare`) dan memuat detailnya dari API.
Data contoh untuk tes hanya dipakai oleh Vitest dan Playwright.

Backend belum menyediakan konfigurasi rekening transfer. Isi variabel publik berikut
di `fe/.env.local` sebelum menjalankan atau membangun frontend. Jika belum lengkap, halaman
pembayaran menampilkan pesan agar Buyer menghubungi admin.

- `NEXT_PUBLIC_TRANSFER_BANK`
- `NEXT_PUBLIC_TRANSFER_NUMBER`
- `NEXT_PUBLIC_TRANSFER_HOLDER`

### Rute dan cara memeriksa state

Gunakan ID yang dikembalikan API untuk `<id-produk>` dan `<id-pesanan>`. Parameter demo
sudah dihapus.

| Rute                                                               | Cara memeriksa                                                                                                                                 |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `/katalog?q=barang-yang-tidak-ada`                                 | Hasil kosong. Perlambat permintaan API untuk melihat indikator memuat.                                                                         |
| `/produk/<id-produk>`                                              | Lihat detail dan status stok dari katalog. ID yang sudah hilang menampilkan Barang tidak ditemukan.                                            |
| `/cari-yang-cocok`, `/meja-perbandingan`, `/wishlist`              | Gunakan filter ukuran, pilih dua barang dari katalog, atau masuk sebagai Buyer untuk menyimpan wishlist.                                       |
| `/profil`                                                          | Isi alamat Buyer. Simpan alamat parsial untuk melihat validasi.                                                                                |
| `/checkout/<id-produk>`                                            | Buat pesanan. Kirim bersamaan dari dua sesi Buyer untuk konflik stok. Pilih berkas selain JPG/PNG untuk validasi bukti.                        |
| `/checkout/<id-produk>?pesanan=<id-pesanan>`                       | Lanjutkan pembayaran yang ada. Tautan tersedia dari detail pesanan.                                                                            |
| `/pesanan`, `/pesanan/<id-pesanan>`                                | Buka riwayat, lanjutkan pembayaran, batalkan sebelum bayar, atau konfirmasi penerimaan. ID pesanan milik Buyer lain memunculkan akses ditolak. |
| `/ulasan`, `/ulasan?milik=saya`, `/ulasan?pesanan=<id-pesanan>`    | Lihat ulasan publik atau milik sendiri. Tulis ulasan dari pesanan selesai.                                                                     |
| `/admin/produk`, `/admin/produk/baru`, `/admin/produk/<id-produk>` | Masuk lewat `/admin/masuk` untuk mengelola produk. Barang dipesan memiliki kolom yang terkunci.                                                |
| `/admin/pesanan?status=verifikasi`, `/admin/pesanan/<id-pesanan>`  | Unggah bukti sebagai Buyer, lalu periksa bukti, setujui, dan simpan resi sebagai Admin.                                                        |
| `/keluar`, `/sesi-berakhir?kembali=/pesanan`                       | Keluar lewat profil atau masuk ulang setelah sesi berakhir.                                                                                    |

Di DevTools, blokir permintaan API untuk memeriksa galat dan tombol Coba lagi. Ubah
kondisi jaringan ke Offline untuk memeriksa layar offline dan pemulihan saat online.

### Playwright

Jalankan dari root repo setelah memasang dependensi.

```powershell
pnpm --filter @pickathrift/fe exec playwright install chromium
pnpm --filter @pickathrift/fe test:e2e
```

Playwright menjalankan build produksi FE di port 3107 dan API uji di port 5107 dengan
MongoDB replica set sementara dan rekening uji. Setelah uji, bangun ulang FE dengan
konfigurasi lokal sebelum memakai `pnpm --filter @pickathrift/fe start`.

## Yang dinilai rubrik (Frontend, bobot bagian 30%)

| Kode | Bobot | Minta apa                                                | Konsekuensi di kode                                                                                         |
| ---- | ----- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| FE1  | 10%   | Routing dan komponen tertata                             | Rute tipis di `src/app`, isi layar di `src/modules`                                                         |
| FE2  | 20%   | Sesuai rancangan **dan responsif**                       | Figma hanya desktop 1440, turunan tablet dan ponsel harus dibuat sendiri                                    |
| FE3  | 20%   | Komponen dipakai ulang, logika terpisah dari tampilan    | Logika ke `hooks/`, komponen hanya menerima props                                                           |
| FE4  | 10%   | Indikator memuat, notifikasi, penanda galat, efek tunjuk | Figma `32-loading`, `33-error`, `30-kosong`, `31-hasil-kosong`                                              |
| FE5  | 30%   | Data dari API, validasi masukan, galat ditangani         | Skor terendah berbunyi "data ditulis langsung di dalam kode tanpa memakai API". Data contoh hanya untuk tes |
| FE6  | 10%   | Tepat waktu                                              | —                                                                                                           |

FE5 bobotnya paling besar. Setiap form wajib punya validasi dan setiap panggilan wajib punya
state gagal yang terlihat, bukan hanya `console.error`.

Layar galat dan kondisi khusus yang sudah digambar di Figma dan langsung menjawab FE4 serta
FE5: `30-kosong`, `31-hasil-kosong`, `32-loading`, `33-error`, `34-akses-ditolak`,
`35-stok-konflik`, `36-validasi-form`, `37-perbandingan-invalid`, `38-konfirmasi-batal`,
`39-ulasan-dilarang`, `40-sukses`.

Nilai tambah G6 (maksimal dua jenis, opsional): dari daftar yang diakui, yang paling dekat
dengan user story ini adalah masuk lewat akun Google (OAuth2), payment gateway, dan API
pengecekan ongkos kirim. Frame `41-lanjutan-*` sampai `45-lanjutan-*` di Figma adalah
kandidatnya.
