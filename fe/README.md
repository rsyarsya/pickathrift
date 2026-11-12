# Frontend PickaThrift

Next.js (App Router), TypeScript, Tailwind CSS 4, Vitest. Baru kerangka: token desain dan
setup, belum ada layar.

## Menjalankan

```powershell
pnpm install
pnpm --filter @pickathrift/fe dev
```

`pnpm install` hanya perlu saat setup pertama atau setelah dependensi berubah.
Buka http://localhost:3000.

Sebelum push: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check` dari root.

## Simulasi auth lokal

Tambahkan `NEXT_PUBLIC_AUTH_SIMULATION=on` ke `fe/.env.local`, lalu jalankan server dev.
File lingkungan tetap lokal. Simulasi otomatis mati pada build production.

- Buyer: `buyer@pickathrift.test` / `Buyer123!`
- Admin: `admin@pickathrift.test` / `Admin123!`

Buka `/daftar`, `/masuk`, atau `/admin/masuk`. Akun uji dibagikan lewat dokumentasi ini;
halaman aplikasi tidak menampilkan panel simulasi.
Coba sandi salah, email yang sudah terdaftar, serta akun Buyer di halaman Admin.
Pendaftaran membuat akun Buyer baru di memori tab.
Refresh mereset akun baru yang didaftarkan. Login Buyer dan pendaftaran menyimpan sesi
sementara di localStorage (`pickathrift.session`) supaya navbar berganti ke versi Buyer;
tidak ada database, cookie, JWT, atau akses dasbor. Login Admin belum mengalihkan ke
mana pun karena dasbor admin belum ada. Gunakan data uji.

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

## Layar di Figma

45 frame desktop 1440, bernomor `01-beranda` sampai `45-lanjutan-admin-dashboard`.
Nomor 41–45 bertanda "lanjutan" dan masuk lingkup Should/Could, bukan Milestone 1.

Nama rute mengikuti nama frame, dalam bahasa Indonesia: `/katalog`, `/produk/[id]`,
`/wishlist`, `/meja-perbandingan`, `/riwayat-pesanan`, `/admin/produk`.

## Data

Semua panggilan backend lewat `src/lib/api.ts`. Jangan memanggil `fetch` langsung dari
komponen: base URL, header, dan penanganan galat hanya ditulis sekali di sana, dan `ApiError`
membawa status HTTP supaya layar bisa membedakan 409 "sudah dipesan" dari jaringan putus.

Selama backend belum ada, modul boleh memakai fixtures lokal di `modules/<bagian>/data/`.
Itu sementara.

Layar tidak membaca fixtures langsung, tapi lewat fungsi service seperti
`modules/catalog/data/products.ts` (`listProducts`, `getProduct`, `reserveProduct`). Begitu
endpoint ada, isi fungsi itu cukup diganti satu panggilan `api()`.

State yang sulit dipicu tanpa backend bisa dipaksa lewat `?demo=`:

| URL                                               | State                   |
| ------------------------------------------------- | ----------------------- |
| `/katalog?demo=memuat`                            | B1.3 Memuat             |
| `/katalog?demo=kosong`                            | B1.4 Hasil kosong       |
| `/katalog?demo=gagal`                             | B1.5 Gagal dimuat       |
| `/produk/<id>?demo=konflik`                       | B2.4 Stok konflik (409) |
| `/wishlist?demo=gagal`                            | Wishlist gagal dimuat   |
| `/cari-yang-cocok?jenis=Jaket&cari=1&demo=kosong` | B4.5 Hasil kosong       |
| `/meja-perbandingan?demo=konflik`                 | 409 saat "Beli ini"     |
| `/checkout/work-jacket-olive`                    | B6.1 Checkout           |
| `/checkout/work-jacket-olive?demo=memproses`      | B6.2 Memproses pesanan   |
| `/checkout/work-jacket-olive?demo=konflik`        | B6.3 Stok konflik (409)  |
| `/checkout/work-jacket-olive?demo=koneksi`        | B6.4 Koneksi terputus    |
| `/checkout/work-jacket-olive?demo=alamat`         | B6.5 Galat alamat        |
| `/checkout/work-jacket-olive?demo=bayar`          | B6.6 Menunggu pembayaran |
| `/checkout/work-jacket-olive?demo=file-ditolak`   | B6.7 File ditolak        |
| `/checkout/work-jacket-olive?demo=verifikasi`     | B6.8 Menunggu verifikasi |
| `/checkout/work-jacket-olive?demo=unggah-ulang`   | B6.9 Perlu unggah ulang   |
| `/checkout/work-jacket-olive?demo=gagal`          | Checkout gagal dimuat    |

Checkout memerlukan sesi Buyer. Pesanan dan bukti gambar disimpan sementara di IndexedDB
(`pickathrift.checkout`). Nomor rekening di checkout adalah contoh untuk simulasi.

| URL | State |
| --- | --- |
| `/pesanan?demo=riwayat` | B7.1 Riwayat dengan empat pesanan contoh |
| `/pesanan?demo=kosong` | B7.2 Riwayat kosong |
| `/pesanan/PCT-001?demo=diproses` | B7.3 Diproses |
| `/pesanan/PCT-001?demo=dikirim` | B7.4 Dikirim |
| `/pesanan/PCT-001?demo=selesai` | B7.5 Selesai |
| `/pesanan/PCT-001?demo=dibatalkan` | B7.6 Dibatalkan |
| `/pesanan/PCT-001?demo=batal` | B7.7 Konfirmasi batal |
| `/ulasan?demo=tulis` | B8.1 Tulis ulasan |
| `/ulasan?demo=validasi` | B8.2 Galat validasi |
| `/ulasan?demo=terkirim` | B8.3 Ulasan terkirim |
| `/ulasan?demo=terkunci` | B8.4 Belum boleh mengulas |
| `/ulasan` | B8.5 Ulasan toko |
| `/profil?demo=default` | B9.1 Profil dengan data contoh |
| `/profil?demo=validasi` | B9.2 Galat validasi |
| `/profil?demo=tersimpan` | B9.3 Toast perubahan disimpan |
| `/pesanan?demo=gagal`, `/pesanan/PCT-001?demo=gagal`, `/ulasan?demo=gagal`, `/profil?demo=gagal` | Galat memuat data |
| `/profil?demo=gagal-simpan` | Galat setelah mengubah data dan menekan Simpan perubahan |

Riwayat normal menampilkan pesanan Buyer yang dibuat di checkout. State diproses dan dikirim
tersedia sebagai demo selama alur admin belum tersedia. Ulasan dari pesanan selesai tersimpan
bersama pesanan di IndexedDB. Profil menyimpan nama dan alamat per akun di localStorage
(`pickathrift.profile.<email>`) dan checkout membacanya saat dibuka. Pesanan dan profil contoh
untuk demo B7–B9 tidak disimpan.

Wishlist dan Meja Perbandingan disimpan di localStorage (`pickathrift.wishlist`,
`pickathrift.compare`) selama belum ada endpoint. `?demo=` ikut terhapus bersama fixtures. Fixtures wajib diganti panggilan `api()` sebelum pengumpulan, lihat FE5 di
bawah.

## Yang dinilai rubrik (Frontend, bobot bagian 30%)

| Kode | Bobot | Minta apa                                                | Konsekuensi di kode                                                                                          |
| ---- | ----- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| FE1  | 10%   | Routing dan komponen tertata                             | Rute tipis di `src/app`, isi layar di `src/modules`                                                          |
| FE2  | 20%   | Sesuai rancangan **dan responsif**                       | Figma hanya desktop 1440, turunan tablet dan ponsel harus dibuat sendiri                                     |
| FE3  | 20%   | Komponen dipakai ulang, logika terpisah dari tampilan    | Logika ke `hooks/`, komponen hanya menerima props                                                            |
| FE4  | 10%   | Indikator memuat, notifikasi, penanda galat, efek tunjuk | Figma `32-loading`, `33-error`, `30-kosong`, `31-hasil-kosong`                                               |
| FE5  | 30%   | Data dari API, validasi masukan, galat ditangani         | Skor terendah berbunyi "data ditulis langsung di dalam kode tanpa memakai API". Fixtures tidak boleh tersisa |
| FE6  | 10%   | Tepat waktu                                              | —                                                                                                            |

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
