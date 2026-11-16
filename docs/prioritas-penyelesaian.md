# Prioritas Penyelesaian PickaThrift

Status audit: 16 November 2026. Acuan penilaian: **mode reguler**, user story
**US6 — Web Thrift Store**, pada workbook `Copy of Proyek_Akhir_PAW_2026_2027.xlsx`
di `D:\download\`.

Dokumen ini mencatat pekerjaan tersisa dari audit. Checklist belum dicentang berarti
pekerjaan atau verifikasinya masih perlu diselesaikan. Perubahan konfigurasi lokal
sesudah audit perlu diperiksa kembali.

## Kondisi yang sudah terverifikasi

- Katalog, produk unik berstok satu, wishlist, profil/alamat, pesanan, pembayaran
  manual, ulasan, dan pengelolaan Admin sudah memakai API.
- Perebutan stok, pembatalan, kedaluwarsa, serta pembatasan akses Buyer/Admin sudah diuji.
- Audit awal `main`: **154 tes FE, 254 tes BE, dan 3 tes Playwright lulus**. Perbaikan FE berikutnya menambah cakupan menjadi **158 tes FE dan 6 tes Playwright lulus**; kode BE tidak berubah.
- Typecheck, lint FE/BE, dan build produksi lulus.
- Lint root lulus pada checkout bersih yang diaudit. `scripts/voiceover.mjs` tidak termasuk commit tersebut; jika berkas lokal itu disertakan kemudian, ulangi pemeriksaannya.

Rincian integrasi tersedia di [integrasi-api-fe.md](integrasi-api-fe.md).

## Ringkasan prioritas

Perbaikan FE pada branch `fix/fe-qa-regressions` juga menyelesaikan dua temuan baru:
dialog alasan memakai ID/nama grup radio unik per instance, dan referensi pesanan
Buyer/Admin memakai 12 karakter terakhir ObjectId dalam huruf kapital. URL/API tetap
memakai ID lengkap. Referensi pendek tidak dijamin unik oleh database.

Enam screenshot login/katalog pada lebar 390, 768, dan 1440 identik dengan baseline;
struktur JSX dan class komponen yang diubah tetap sama. Lihat
[ringkasan QA perbaikan FE](qa-perbaikan-fe-20261116.md). Rekening, pembagian kerja
aktual, serta sisa pengujian zoom native Firefox masih perlu diselesaikan.

| Prioritas                 | Pekerjaan                                     | Dampak utama                                                                |
| ------------------------- | --------------------------------------------- | --------------------------------------------------------------------------- |
| P1                        | Isi konfigurasi rekening toko                 | Kesiapan demo alur pembayaran; G1                                           |
| Selesai pada perbaikan FE | Newsletter menampilkan layanan belum tersedia | Tidak ada klaim pendaftaran atau pengiriman email yang tidak dilakukan; FE5 |
| P1                        | Perbarui README root dan pembagian kerja      | Kejelasan setup, ruang lingkup, dan kontribusi; G2/G4                       |
| P2                        | Perluas pengujian UI dan perangkat            | Responsivitas, interaksi, dan penanganan galat; FE2/FE4/FE5                 |
| P2                        | Bersihkan lint root                           | Konsistensi pemeriksaan repo dan kesiapan pengumpulan                       |
| P2, opsional              | Deployment dan bukti integrasi pihak ketiga   | Kemudahan demo dan peluang nilai tambah G6                                  |
| P3                        | Polish panduan ukuran, tray, dan gambar       | Kenyamanan penggunaan dan kualitas antarmuka                                |
| Sebelum pengumpulan       | Siapkan presentasi, video, dan bukti kerja    | G2/G3/G4/G5 serta ketepatan pengumpulan                                     |

## P1 — Selesaikan sebelum demo alur utama

### P1.1 — Konfigurasi rekening toko

Saat audit, ketiga variabel rekening di `fe/.env.local` belum terisi. Halaman
pembayaran menampilkan pesan agar Buyer menghubungi Admin. Tes Playwright memakai
rekening uji tersendiri sehingga keberhasilan tes belum membuktikan konfigurasi lokal siap.

- [ ] Isi `NEXT_PUBLIC_TRANSFER_BANK` dengan nama bank yang disepakati.
- [ ] Isi `NEXT_PUBLIC_TRANSFER_NUMBER` dengan nomor rekening yang disepakati.
- [ ] Isi `NEXT_PUBLIC_TRANSFER_HOLDER` dengan nama pemilik rekening yang disepakati.
- [ ] Jalankan ulang server development atau build ulang FE agar konfigurasi diterapkan.
- [ ] Periksa rekening dan nominal pada halaman pembayaran serta detail pesanan.

**Selesai ketika:** instruksi pembayaran menampilkan rekening yang benar, total sesuai
respons BE, dan konfigurasi lokal tetap di luar Git. Untuk demo, gunakan rekening uji
yang jelas ditandai sebagai data simulasi.

Referensi: [konfigurasi checkout](../fe/src/modules/checkout/data/checkout.ts) dan
[panduan FE](../fe/README.md).

### P1.2 — Newsletter: keberhasilan semu dihentikan

Keputusan: form dan desain footer dipertahankan. Layanan newsletter belum disediakan.
Email valid menghasilkan pesan “Newsletter belum tersedia. Email belum didaftarkan.”
melalui state galat yang sudah ada. Tidak ada timer sukses, penyimpanan email, atau
permintaan API newsletter. Implementasi layanan nyata menjadi pekerjaan terpisah.

- [x] Hentikan hasil sukses simulasi dan pesan “Terdaftar”.
- [x] Pertahankan validasi email dan tampilkan status layanan yang sebenarnya.
- [x] Verifikasi bahwa tidak ada API atau timer pendaftaran yang dijalankan.

**Selesai ketika:** setiap klaim berhasil pada UI sesuai tindakan yang benar-benar
dilakukan sistem. Newsletter bukan kebutuhan wajib US6.

Referensi: [service newsletter](../fe/src/modules/home/data/newsletter.ts) dan
[footer](../fe/src/components/layout/Footer.tsx).

### P1.3 — README root dan pembagian kerja

Status API, backend, batas reservasi, serta tautan setup pada README root sudah
diperbarui. Pembagian kerja anggota masih perlu dikonfirmasi kelompok dan tidak
ditentukan hanya dari jumlah commit.

- [x] Perbarui status implementasi FE/BE, sumber data API, dan timer reservasi.
- [x] Selaraskan petunjuk root dengan README FE/BE, kebutuhan MongoDB replica set,
      konfigurasi rekening, serta perintah menjalankan dan menguji aplikasi.
- [ ] Catat pembagian kerja aktual seluruh anggota, termasuk perubahan tanggung jawab Admin.
- [ ] Hubungkan bagian pekerjaan dengan modul, dokumen, atau riwayat pengerjaan yang relevan.
- [ ] Pastikan setiap anggota bisa menjelaskan bagian yang menjadi tanggung jawabnya.

**Selesai ketika:** pembaca baru dapat memahami kondisi aplikasi dan menjalankannya;
pembagian kerja sesuai kontribusi yang sebenarnya. Pada G2, kesesuaian kontribusi
dengan pembagian kerja lebih penting daripada jumlah commit.

Referensi: [README root](../README.md), [README FE](../fe/README.md), dan
[README BE](../be/README.md).

## P2 — Pengujian dan kesiapan pengumpulan

### P2.1 — Perluas cakupan UI

Tiga tes Playwright saat audit memakai desktop Chromium berukuran 1440 × 900.
Alur utama sudah lulus, tetapi cakupan tersebut belum membuktikan seluruh layar
berfungsi baik pada mobile, browser lain, dan zoom tinggi.

- [ ] Uji viewport mobile dan tablet: katalog/filter, detail, checkout, profil, dan Admin.
- [ ] Uji keyboard dan fokus dialog: login, filter, konflik stok, bukti, serta pembatalan.
- [ ] Uji zoom browser 200%, termasuk di Edge dan Firefox, sesuai catatan QA-007.
- [ ] Uji wishlist dan perbandingan melalui UI, termasuk barang nonaktif dan galat API.
- [ ] Uji tambah/edit produk serta unggah foto melalui UI Admin.
- [ ] Uji dua sesi Admin dengan versi pesanan berbeda; 409 harus meminta muat ulang,
      lalu keputusan baru memerlukan pemeriksaan ulang.
- [ ] Uji permintaan unggah ulang dan penolakan pembayaran melalui UI.
- [ ] Catat hasil, browser/viewport, dan masalah yang ditemukan; tambah tes otomatis
      untuk alur penting yang belum tercakup.

**Selesai ketika:** tidak ada kontrol penting yang terpotong atau tidak terjangkau;
alur utama dan pemulihan galat berfungsi pada perangkat yang diuji.

Referensi: [konfigurasi Playwright](../fe/playwright.config.ts) dan
[tes alur pesanan](../fe/e2e/orders.spec.ts).

### P2.2 — Lint root

- [x] Periksa checkout bersih: `scripts/voiceover.mjs` tidak termasuk commit yang diaudit.
- [x] Jalankan `pnpm lint` dari root dan pastikan seluruh pemeriksaan lulus.
- [ ] Pastikan skrip/media kerja yang akan masuk Git memang bagian dari hasil proyek.

**Selesai ketika:** lint root lulus dan berkas yang disertakan dalam pengumpulan telah ditinjau.

### P2.3 — Deployment dan nilai tambah G6 — opsional

Menurut workbook, deployment **bukan syarat wajib mode reguler**. Deployment selain
Vercel termasuk salah satu jenis nilai tambah yang diakui. G6 mengakui maksimal
dua jenis integrasi pihak ketiga. Keberadaan sebuah SDK pada dependensi belum
membuktikan integrasi sudah berjalan.

- [ ] Putuskan apakah deployment akan dipakai untuk demo/pengumpulan dan nilai tambah.
- [ ] Jika deploy, sediakan FE, BE, MongoDB replica set/Atlas, serta penyimpanan upload persisten.
- [ ] Atur URL API, akses gambar, HTTPS, dan konfigurasi rekening untuk lingkungan tersebut.
- [ ] Dokumentasikan URL aplikasi, petunjuk menjalankan, serta prosedur backup database dan upload.
- [ ] Uji aplikasi dari perangkat lain dan pastikan foto/bukti tetap ada setelah server restart.
- [ ] Jika mengejar G6, pilih maksimal dua jenis fitur yang diakui dan siapkan bukti penggunaannya.

Contoh yang relevan dari daftar rubrik: email otomatis, deployment selain Vercel,
payment gateway, Google OAuth, atau API ongkos kirim. Pilihan fitur perlu disesuaikan
dengan waktu yang tersedia dan manfaatnya untuk aplikasi.

**Selesai ketika dipilih:** integrasi berjalan pada aplikasi dan dapat didemonstrasikan.
Untuk deployment, foto produk tetap publik dan bukti pembayaran tetap membutuhkan autentikasi.

Sebelum membuka akses publik, tinjau pembatasan percobaan login, kebijakan origin CORS,
dan pengelolaan berkas upload. Ini penguatan operasional, bukan fitur wajib tambahan US6.

## P3 — Polish antarmuka dan performa

- [ ] Buat panduan mengukur Celana: pinggang, panjang, dan lebar paha; sesuaikan panduan
      yang ditampilkan dengan kategori pada Cari yang Cocok.
- [ ] Periksa dan perbaiki tray Bandingkan yang menutupi footer; pastikan kontrol tetap mudah diakses.
- [ ] Optimalkan foto sumber besar dan cek kualitas setelah diperkecil/dikompresi.
- [ ] Ukur ulang LCP pada kondisi cache dingin dan simulasi jaringan mobile.
      Hasil lokal dengan cache hangat belum mewakili koneksi pengguna sebenarnya.
- [ ] Tinjau kembali kesesuaian desain dan catatan DS-008 bersama penanggung jawab desain.

**Selesai ketika:** panduan sesuai kategori, footer tidak tertutup, gambar tetap layak,
dan hasil pengukuran menyebutkan kondisi pengujian secara jelas.

## Sebelum pengumpulan — Bukti dan presentasi

- [ ] Siapkan video kelompok dengan durasi maksimal 10 menit sesuai ketentuan workbook.
- [ ] Susun demo: katalog → daftar/login → wishlist → checkout → bukti bayar → Admin
      verifikasi/kirim → Buyer terima → ulasan.
- [ ] Sertakan demonstrasi dua Buyer berebut barang yang sama: satu berhasil, satu konflik.
- [ ] Siapkan penjelasan transaksi stok, otorisasi peran/kepemilikan, hashing sandi,
      validasi, dan penanganan galat.
- [ ] Pastikan setiap anggota memahami dan dapat menjelaskan bagian pekerjaannya.
- [ ] Tinjau riwayat pengerjaan dan bukti kontribusi yang sebenarnya.
- [ ] Konfirmasi tenggat serta format pengumpulan dari pengampu; workbook rubrik
      saja belum memberikan seluruh detail administrasi pengumpulan.

## Urutan eksekusi yang disarankan

1. Konfigurasi rekening dan penanganan newsletter.
2. README root serta pembagian kerja aktual.
3. Pengujian UI tambahan dan perbaikan temuan.
4. Lint root.
5. Deployment/integrasi G6 bila dipilih.
6. Polish dan pengukuran performa.
7. Finalisasi video, demo, dan bukti kontribusi sebelum tenggat.

Pekerjaan dalam dokumen ini belum memberi izin untuk commit atau push otomatis.
Siapkan perubahan untuk ditinjau pemilik repo.
