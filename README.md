# PickaThrift

PickaThrift adalah web store untuk satu usaha thrift yang memusatkan katalog, ketersediaan produk unik, dan pengelolaan pesanan. Aplikasi dirancang untuk mencegah dua pembeli berhasil membeli barang yang sama, sekaligus membantu Buyer mencari, menyimpan, membandingkan, memesan, dan mengulas produk.

Repositori ini menggunakan satu monorepo untuk frontend dan backend. Saat ini repositori baru berisi fondasi struktur dan dokumentasi; kode aplikasi belum tersedia.

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

Fitur payment gateway sandbox, timer reservasi, keranjang, Blindbox, dan fitur tambahan lainnya masih menjadi ruang lingkup Should/Could dan belum diimplementasikan.

## Pengguna sistem

- **Buyer** mencari, menyimpan, membandingkan, memesan, dan mengulas produk. Buyer hanya dapat mengakses pesanannya sendiri.
- **Admin** mengelola produk, ketersediaan, bukti pembayaran, status pesanan, nomor resi, dan pembatalan.

Setiap produk hanya memiliki satu unit dengan status Tersedia, Dipesan, atau Terjual. Wishlist dan Meja Perbandingan tidak mengunci produk.

## Struktur repositori

```text
pickathrift/
├── apps/
│   ├── frontend/
│   │   └── README.md
│   └── backend/
│       └── README.md
├── docs/
│   └── README.md
└── README.md
```

- `apps/frontend` disiapkan untuk aplikasi React atau Next.js.
- `apps/backend` disiapkan untuk API ExpressJS dan MongoDB.
- `docs` menjadi indeks dokumentasi proyek dan laporan Milestone 1.

## Tech Stacks

### Digunakan pada tahap analisis dan perancangan

- Git dan GitHub untuk version control serta repositori.
- Postman untuk pengujian awal rancangan endpoint.
- Figma sebagai acuan awal desain antarmuka yang disebutkan dalam laporan Milestone 1.

### Wajib untuk implementasi Regular Mode

- Backend: ExpressJS.
- Basis data: MongoDB.
- Frontend: React atau Next.js.

Pilihan React atau Next.js, package manager, dan konfigurasi workspace belum diputuskan. Belum ada dependensi aplikasi yang dipasang.

## Dokumentasi

- [Indeks dokumentasi proyek](docs/README.md)
- [Laporan dan dokumen proyek di Google Drive](https://drive.google.com/drive/folders/18fWD-o-8HaH5uzsJtjpsghzn-5u93bpv?usp=sharing)
