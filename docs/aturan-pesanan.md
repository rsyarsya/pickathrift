# Aturan Pesanan dan Pembayaran

Dokumen ini menjadi acuan bersama FE dan BE untuk status pesanan, pembatalan, batas waktu
pembayaran, dan kunci stok. Desain terkait ada di Figma page `ag`, layar B6.x (Buyer) dan M3.x
(Admin). Nama status dan endpoint di bawah adalah usulan; yang wajib sama adalah aturannya.

## Status

| Status | Arti |
|---|---|
| `MENUNGGU_PEMBAYARAN` | Pesanan dibuat, bukti bayar belum diunggah. |
| `MENUNGGU_VERIFIKASI` | Bukti sudah diunggah, menunggu admin. |
| `PERLU_UNGGAH_ULANG` | Admin meminta bukti baru, misalnya karena foto buram. |
| `DIPROSES` | Pembayaran diterima admin. |
| `DIKIRIM` | Resi sudah diisi. |
| `SELESAI` | Buyer mengonfirmasi barang diterima. |
| `DIBATALKAN` | Dibatalkan Buyer, kedaluwarsa, atau ditolak admin. |

## Transisi

| Dari | Aksi | Ke |
|---|---|---|
| `MENUNGGU_PEMBAYARAN` | Buyer unggah bukti | `MENUNGGU_VERIFIKASI` |
| `MENUNGGU_PEMBAYARAN` | Buyer batalkan pesanan | `DIBATALKAN` |
| `MENUNGGU_PEMBAYARAN` | Lewat batas waktu bayar | `DIBATALKAN` |
| `MENUNGGU_VERIFIKASI` | Admin terima | `DIPROSES` |
| `MENUNGGU_VERIFIKASI` | Admin minta unggah ulang | `PERLU_UNGGAH_ULANG` |
| `MENUNGGU_VERIFIKASI` | Admin tolak | `DIBATALKAN` |
| `PERLU_UNGGAH_ULANG` | Buyer unggah ulang | `MENUNGGU_VERIFIKASI` |
| `PERLU_UNGGAH_ULANG` | Admin terima | `DIPROSES` |
| `PERLU_UNGGAH_ULANG` | Admin tolak | `DIBATALKAN` |
| `DIPROSES` | Admin simpan resi | `DIKIRIM` |
| `DIKIRIM` | Buyer konfirmasi diterima | `SELESAI` |

Transisi lain ditolak dengan `409 Conflict`.

Buyer hanya dapat membatalkan pesanan pada status `MENUNGGU_PEMBAYARAN`. Setelah bukti
diunggah, uang mungkin sudah masuk, sehingga keputusan ada di admin dan tidak diperlukan alur
refund.

## Batas waktu pembayaran

- Batas bayar **6 jam** sejak pesanan dibuat: `expiresAt = createdAt + 6 jam`. Simpan angkanya
  di satu konstanta, misalnya `PAYMENT_WINDOW_HOURS = 6`.
- Batas ini **hanya berlaku pada `MENUNGGU_PEMBAYARAN`**. Pada `MENUNGGU_VERIFIKASI` dan
  `PERLU_UNGGAH_ULANG` tidak ada pembatalan otomatis.
- Tidak perlu cron. Kedaluwarsa dicek setiap kali pesanan atau produk dibaca, dan **wajib** juga
  dicek saat:
  - membuat pesanan baru (agar barang dari pesanan kedaluwarsa bisa dipesan lagi), dan
  - mengunggah bukti (unggahan setelah kedaluwarsa ditolak dengan `409`).
- Pesanan yang kedaluwarsa diubah menjadi `DIBATALKAN` dan kunci stoknya dilepas.
- Respons pesanan menyertakan `expiresAt` agar FE dapat menampilkan hitung mundur.

## Kunci stok

Setiap barang hanya satu unit, jadi barang dikunci untuk satu pesanan.

- `POST /api/orders` mengunci barang dengan `product.lockedByOrderId = order.id`. Jika barang
  sudah dikunci pesanan lain yang masih aktif, balas `409` (FE menampilkan layar B6.3
  "Keduluan pembeli lain").
- Kunci dan lepas harus atomik. Dengan MongoDB, gunakan update bersyarat, misalnya
  `findOneAndUpdate({ _id, lockedByOrderId: null, status: 'TERSEDIA' }, { $set: { lockedByOrderId } })`,
  supaya dua pembeli tidak bisa mengunci barang yang sama bersamaan.
- Saat pesanan dibatalkan (oleh Buyer, kedaluwarsa, atau admin), kunci hanya dilepas jika
  `product.lockedByOrderId === order.id`. Ini mencegah pesanan lama melepas barang yang sudah
  dikunci pesanan lain.
- Saat admin menerima pembayaran, barang berubah menjadi `TERJUAL`.

## Endpoint yang dibutuhkan FE

Buyer:

- Buat pesanan.
- Unggah bukti pembayaran (dipakai juga untuk unggah ulang).
- Batalkan pesanan.

Admin:

- Daftar pesanan dengan filter status, termasuk `PERLU_UNGGAH_ULANG`.
- Terima pembayaran.
- Minta unggah ulang, dengan catatan untuk Buyer.
- Tolak dan batalkan, dengan alasan: nominal tidak sesuai total, tidak ada dana masuk, atau
  alasan lain.

## Respons galat yang ditangani FE

| Kode | Kapan |
|---|---|
| `409` | Barang sudah dikunci pesanan lain. |
| `409` | Transisi status tidak valid, misalnya Buyer membatalkan setelah bukti diunggah. |
| `409` | Unggah bukti setelah pesanan kedaluwarsa. |
| `422` | Berkas bukti tidak valid (format atau ukuran). |
