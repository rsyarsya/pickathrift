# Memakai data dari BE lama

## Tambahan batch 4

Server wajib MongoDB replica set/Atlas. Dry-run sekarang memeriksa seluruh order,
termasuk yang sudah punya snapshot. Wajib tersedia `address_snapshot` lengkap,
`item_price`, `shipping_fee`, total yang sama dengan jumlah keduanya, dan waktu
`expiresAt`, `createdAt`, `updatedAt` valid. Data yang tidak diketahui adalah blocker;
JANGAN menyalin alamat profil sekarang atau menambah ongkir ke total historis dengan
tebakan. Operator perlu memverifikasi bukti asli atau memakai database uji baru.
Migrasi tidak mereset database dan tidak menulis database tim secara otomatis.

Status lama pending/shipped/completed/cancelled dapat dipetakan ke
MENUNGGU_PEMBAYARAN/DIKIRIM/SELESAI/DIBATALKAN jika semua field wajib lengkap. `paid`
ambigu dan menjadi blocker; operator menentukan status berdasarkan bukti.
Produk reserved harus aktif, memiliki reservation_order_id, dan menunjuk tepat satu
order status Menunggu Pembayaran/Verifikasi/Perlu Unggah Ulang untuk produk tersebut.
Kunci hilang, pemilik berbeda, atau beberapa order aktif tidak diperbaiki dengan tebakan.
Produk available/sold tidak boleh menyimpan kunci reservasi. Metadata pembatalan lama
yang tidak tersedia tetap null; tidak ditebak sebagai pembatalan Buyer.

## Tambahan batch 3

Alamat string lama dipindahkan utuh ke `legacy_address` internal dan `address` menjadi
null. Nilainya tidak dicetak atau dikembalikan API. Tidak ada tebakan penerima/kota/kode
pos; Buyer melengkapi alamat terstruktur sebelum checkout. ID, hash sandi dan nama akun
tetap. Benturan dengan arsip alamat yang sudah ada atau objek alamat tidak valid
menjadi blocker. Alamat baru yang valid dinormalisasi menggunakan aturan API.

Dry-run juga memeriksa koleksi `wishlists`: pasangan pemilik–produk duplikat, produk
hilang, serta pemilik hilang/bukan Buyer menjadi blocker. Operator memutuskan koreksi
record berdasarkan data asli setelah backup; migrator tidak menghapus item otomatis.
Unique index pasangan dipasang hanya setelah pemeriksaan blocker berhasil. Startup
menonaktifkan auto-index dan memeriksa data sebelum memasang index serta membuka port.

Perbaikan batch 1–2 mengubah normalisasi email dan model produk. Startup sekarang
memeriksa data mentah sebelum membuka port. Data yang perlu ditinjau tidak otomatis
dinormalisasi, disembunyikan diam-diam, dihapus, atau digabungkan ke akun lain.

## Langkah menjalankan

1. Backup database yang akan dipakai dan hentikan semua instance BE yang menulis ke database itu.
2. Konfigurasikan `MONGODB_URI` di environment lokal atau `be/.env` untuk database yang
   memang hendak diperiksa. Jangan commit konfigurasi tersebut. Gunakan salinan lokal lebih dahulu.
3. Dari root repo, jalankan `pnpm --filter @pickathrift/be migrate:legacy`.
   Ini **dry-run**: hasilnya jumlah perubahan dan daftar blocker berdasarkan collection,
   ID, serta field. Sandi, email, dan isi produk tidak dicetak.
4. Jika ada blocker, tinjau record terkait melalui alat pengelola MongoDB pada database
   yang sama. Lengkapi data wajib berdasarkan data asli dan selesaikan benturan email
   dengan keputusan pemilik data. Tidak ada penggabungan akun/pemindahan order otomatis.
   Jalankan dry-run kembali sampai `blockers` bernilai 0.
5. Setelah hasilnya diperiksa, jalankan `pnpm --filter @pickathrift/be migrate:legacy --apply`.
   Apply memerlukan MongoDB replica set/Atlas dengan dukungan transaksi. Semua perubahan
   dokumen berada dalam satu transaksi; kegagalan tidak meninggalkan perubahan dokumen parsial.
   Indeks unik email dipastikan tersedia sebelum transaksi.
6. Ulangi dry-run: jumlah perubahan seharusnya 0. Jalankan BE dan cek login, katalog,
   detail/edit produk, serta riwayat pesanan sebelum menggunakan database bersama.

Perintah dapat dijalankan ulang; data yang sudah sesuai tidak ditulis ulang. Apply
menolak blocker meskipun flag `--apply` diberikan. Alat ini tidak menjalankan reset,
hard-delete, mengubah hash sandi/peran/ID, ataupun menghapus field lama.

## Pemetaan yang dilakukan

- Email menjadi trim + huruf kecil. Email yang normalisasinya sama dilaporkan sebagai
  benturan; pengguna terkait tidak digabung, dihapus, atau dipromosikan.
- `title` menjadi `name`, `image_url` menjadi array `images` berisi foto pertama.
  Field baru yang sudah ada menjadi acuan. Kategori memakai pilihan FE; `clothing_type`
  dapat mengisi kategori lama yang bukan pilihan FE. Dua kategori lama yang bertentangan
  menjadi blocker. Setelah produk memakai bentuk baru, field lama tidak mengalahkannya.
- `status: inactive` menjadi `status: available, active: false`; produk lama lainnya
  mendapat `active: true` jika field tersebut belum ada. Ukuran, merek, gaya, dan kondisi
  wajib harus valid: data yang tidak ada tidak diisi dengan tebakan.
- Warna kosong dan daftar pengukuran kosong diperbolehkan FE; default tersebut boleh
  ditambahkan. Timestamp produk harus valid dan dipertahankan. ID serta referensi tetap sama.
- Order lama tanpa `product_snapshot` mendapat salinan **data produk yang tersedia saat
  migrasi**, dengan harga dari `item_price` yang sudah diverifikasi operator. BE lama menyimpan
  harga barang tanpa ongkir pada `total_price`; operator wajib memisahkan nilai historis
  berdasarkan bukti sebelum migrasi batch 4. Ini tidak mengklaim merekonstruksi deskripsi/foto asli saat
  checkout. `product_snapshot_source: legacy-current-product` membedakannya dari salinan
  `checkout` pada pesanan baru. Order dengan referensi hilang/harga tidak valid menjadi blocker.

Foto/teks salinan order lama selanjutnya tidak ikut perubahan produk. Migrasi tidak menjalankan pembayaran atau membatalkan order. Setelah startup lolos,
request pemicu dapat membatalkan order yang sudah lewat expiresAt melalui transaksi batch 4.
Pemeriksaan startup ditujukan untuk skala data proyek ini dan memindai data sekali saat
startup. Jalankan ulang dry-run bila ada data yang dimasukkan langsung lewat database.
