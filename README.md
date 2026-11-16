# PickaThrift

PickaThrift adalah web store untuk satu usaha thrift yang memusatkan katalog, ketersediaan produk unik, dan pengelolaan pesanan. Aplikasi dirancang untuk mencegah dua pembeli berhasil membeli barang yang sama, sekaligus membantu Buyer mencari, menyimpan, membandingkan, memesan, dan mengulas produk.

Repositori ini menggunakan satu monorepo untuk frontend Next.js dan API Express/MongoDB. Katalog, pencocokan ukuran, wishlist, profil, checkout, pembayaran manual, pesanan, ulasan, dan Admin menggunakan API. Meja Perbandingan menyimpan pilihan ID di browser dan membaca detail produk dari API. Newsletter belum tersedia; form menampilkan status tersebut tanpa mengklaim pendaftaran berhasil. Lihat [panduan FE](fe/README.md) dan [panduan BE](be/README.md) untuk setup.

## Tim

Kelompok 19:

1. Annora Farah Aprilla Setyawan — 24/538937/TK/59766
2. Harum Satiti Astyanti — 24/543494/TK/60398
3. Muhammad Farrel Al Ghazy — 24/540589/TK/60022
4. Rasyadwa Arsya Irnantyanto — 24/534714/TK/59283

Peran yang telah dikonfirmasi:

- Rasyadwa Arsya Irnantyanto: Project Manager, sekaligus mendukung pekerjaan frontend dan backend.

Pembagian peran tiga anggota lainnya belum tercatat secara terverifikasi dalam repositori atau laporan Milestone 1.

## Fitur utama Milestone 1

- Katalog dengan pencarian, filter, pengurutan, dan status ketersediaan.
- Detail produk, termasuk atribut dan ukuran pakaian dalam sentimeter.
- Registrasi/login serta otorisasi Buyer dan Admin.
- Wishlist Buyer.
- Pembelian langsung dengan transfer manual dan bukti pembayaran.
- Reservasi atomik untuk produk unik berstok satu.
- Riwayat serta status pesanan Buyer.
- Rating dan ulasan setelah pesanan selesai.
- CRUD produk dan pengelolaan pesanan oleh Admin.
- Cari yang Cocok berdasarkan preferensi dan ukuran pakaian opsional.
- Meja Perbandingan untuk maksimal dua produk sejenis.

Reservasi memakai batas pembayaran 6 jam dari backend dan hitung mundur pada frontend. Payment gateway sandbox, keranjang, Blindbox, dan fitur tambahan lainnya belum diimplementasikan.

## Pengguna sistem

- **Buyer** mencari, menyimpan, membandingkan, memesan, dan mengulas produk. Buyer hanya dapat mengakses pesanannya sendiri.
- **Admin** mengelola produk, ketersediaan, bukti pembayaran, status pesanan, nomor resi, dan pembatalan.

Setiap produk hanya memiliki satu unit dengan status Tersedia, Dipesan, atau Terjual. Wishlist dan Meja Perbandingan tidak mengunci produk.

## Struktur repositori

```text
pickathrift/
├── fe/                 # Next.js App Router, TypeScript, Tailwind CSS 4
├── be/                 # ExpressJS dan MongoDB
├── docs/
├── package.json        # skrip workspace: dev, build, lint, typecheck, test, format
└── pnpm-workspace.yaml
```

- `fe` berisi frontend. Strukturnya dijelaskan di [fe/README.md](fe/README.md).
- `be` berisi API ExpressJS dan MongoDB, termasuk pengujian dengan database terisolasi. Lihat [be/README.md](be/README.md).
- `docs` menjadi indeks dokumentasi proyek dan laporan Milestone 1.

Repositori ini satu pnpm workspace. Jalankan `pnpm install` sekali di root, lalu
`pnpm --filter @pickathrift/fe dev` untuk frontend. Perintah `pnpm lint`, `pnpm typecheck`,
`pnpm test`, dan `pnpm format:check` berlaku untuk seluruh workspace.

## Tech Stacks

### Digunakan pada tahap analisis dan perancangan

- Git dan GitHub untuk version control serta repositori.
- Postman untuk pengujian awal rancangan endpoint.
- Figma sebagai acuan awal desain antarmuka yang disebutkan dalam laporan Milestone 1.

### Wajib untuk implementasi Regular Mode

- Backend: ExpressJS.
- Basis data: MongoDB.
- Frontend: React atau Next.js.

Keputusan tim: frontend memakai Next.js App Router dengan TypeScript, Tailwind CSS 4, dan Vitest.
Package manager pnpm dengan satu workspace di root. Jalankan FE dan BE pada terminal terpisah sesuai README masing-masing. Backend memerlukan MongoDB replica set/Atlas; konfigurasi MongoDB, JWT, rekening transfer, dan URL API disimpan lokal. Rekening sungguhan atau rekening demo berlabel jelas harus ditentukan pemilik proyek sebelum demo/deploy.

## Dokumentasi

- [Indeks dokumentasi proyek](docs/README.md)
- [Laporan dan dokumen proyek di Google Drive](https://drive.google.com/drive/folders/18fWD-o-8HaH5uzsJtjpsghzn-5u93bpv?usp=sharing)
