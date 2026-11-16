# QA perbaikan FE tanpa perubahan desain

Baseline: `bb858ac`, 16 November 2026. Branch lokal: `fix/fe-qa-regressions`.

## Perubahan

- Dialog penolakan dan unggah ulang Admin memakai ID judul, textarea, error, serta nama grup radio unik per instance melalui React `useId`. Pilihan dialog tertutup tidak lagi mengganggu dialog aktif.
- Buyer dan Admin menggunakan formatter referensi yang sama: ObjectId menjadi `#` diikuti 12 karakter terakhir dalam huruf kapital. Contoh tiga pesanan QA: `#53435BA005C1`, `#53435BA005C4`, `#53435BA005C7`. ID lengkap tetap dipakai pada URL dan API; ID lama selain ObjectId dipertahankan. Ini referensi tampilan, bukan nomor unik yang dijamin database.
- Form newsletter tetap tersedia dengan validasi sebelumnya. Pengiriman email valid menampilkan “Newsletter belum tersedia. Email belum didaftarkan.”, tanpa timer, request API, atau sukses simulasi. State sukses dan teks “Terdaftar” dihapus dari logika footer.
- README dan prioritas diperbarui sesuai implementasi. Rekening serta pembagian kerja aktual tetap membutuhkan informasi pemilik proyek.

## Pengujian

| Pemeriksaan                    | Hasil                                                         |
| ------------------------------ | ------------------------------------------------------------- |
| Unit FE                        | 158 lulus, 25 file                                            |
| Lint root                      | Lulus                                                         |
| Typecheck FE                   | Lulus                                                         |
| Build produksi                 | Lulus melalui webServer E2E                                   |
| E2E                            | 6 lulus: tiga skenario lama dan tiga pengujian regresi/visual |
| Pembandingan screenshot        | 6 pasangan identik, 0 piksel berbeda                          |
| Pemeriksaan struktur JSX/class | Sama pada Footer, ReasonDialog, dan OrderParts                |

Tes referensi memeriksa tiga ObjectId dengan awalan sama, konsistensi Buyer/Admin, ObjectId dengan kapitalisasi campuran, ID lama, serta URL yang tetap memuat ID lengkap. Tes newsletter memastikan pesan 503 yang benar tanpa fetch atau timer.

Regresi dialog menggunakan API dan database sementara: produk, pesanan, serta bukti disiapkan sebagai data uji. Uji mencakup radio mouse/ArrowDown, kedua dialog pada halaman sama, label aksesibilitas, alasan lain kosong/kurang dari lima karakter, tutup dengan Escape/Kembali, buka ulang yang mereset pilihan, serta alasan dan status yang benar-benar diterima API saat unggah ulang dan pembatalan.

Perbandingan visual menggunakan build baseline sebelum perbaikan dan build sesudahnya, masing-masing dengan data seed yang sama. Halaman login dan katalog (termasuk footer) diperiksa pada lebar 390, 768, dan 1440 dengan tinggi viewport 900. Seluruh pasangan mempunyai dimensi sama dan nol piksel berbeda. Pemeriksaan JSX memastikan urutan elemen dan semua nilai className tetap identik pada komponen produksi yang berubah. Tidak ada CSS, aset, ikon, atau animasi yang diubah. Isi referensi, pesan newsletter, dan indikator radio yang diperbaiki merupakan perubahan perilaku yang disengaja.

Artefak lokal: `output/playwright/regression-unit.log`, `regression-lint.log`, `regression-types.log`, `regression-e2e.log`, dan folder `output/playwright/fe-regressions/` yang memuat screenshot serta `visual-comparison.json`.

## Batas pemeriksaan

Tidak ada mutasi Atlas tim atau perubahan backend, DTO, skema database, maupun dependensi. Angka 254 tes BE adalah hasil audit baseline sebelumnya, bukan tes yang dijalankan ulang untuk perubahan FE ini.

Zoom native Firefox 200% tetap belum terverifikasi: pada audit sebelumnya Computer Use menghentikan kontrol karena penegakan kebijakan URL tidak didukung browser tersebut. Hasil regresi baru memakai Chromium terisolasi dan tidak mengklaim pemeriksaan Firefox tersebut selesai.

Laporan audit sebelumnya `qa-integrasi-20261116.md` merupakan catatan kondisi baseline; status perbaikan tiga masalah FE mengikuti laporan ini. Panduan/aset Celana, optimasi gambar, layanan email nyata, konfigurasi rekening sungguhan, deployment, dan konfirmasi kontribusi anggota tetap dikerjakan terpisah. Tidak ada commit atau push pada tahap ini.
