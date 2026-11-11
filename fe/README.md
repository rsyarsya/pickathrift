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
