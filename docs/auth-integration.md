# Autentikasi frontend–backend

Form `/daftar`, `/masuk`, dan `/admin/masuk` menggunakan API backend. Registrasi membuat akun buyer; setelah berhasil, pengguna masuk melalui halaman login. Mematikan simulasi tidak lagi menonaktifkan tombol form.

## Menjalankan lokal

1. Jalankan `pnpm install --frozen-lockfile` dari root repo.
2. Isi konfigurasi lokal `be/.env`: `PORT=5000`, `MONGODB_URI` dari tim, dan `JWT_SECRET` dari tim. Jangan taruh rahasia backend pada variabel `NEXT_PUBLIC_*` atau commit berkas lingkungan.
3. Isi `fe/.env.local` dengan `NEXT_PUBLIC_API_URL=http://localhost:5000` dan `NEXT_PUBLIC_AUTH_SIMULATION=off`.
4. Jalankan `pnpm --filter @pickathrift/be start` di terminal pertama dan `pnpm --filter @pickathrift/fe dev` di terminal kedua. Buka `http://localhost:3000/masuk`.
5. Jika startup backend melaporkan data lama belum siap, jalankan `pnpm --filter @pickathrift/be migrate:legacy` untuk pemeriksaan tanpa perubahan. Tinjau perubahan sebelum memakai `--apply`; mode apply juga membuat indeks dan dapat menormalisasi lebih dari satu dokumen.

Jika port standar dipakai checkout lain, gunakan terminal PowerShell terpisah dari root repo:

```powershell
$env:PORT = '5001'
pnpm --filter @pickathrift/be start
```

```powershell
$env:NEXT_PUBLIC_API_URL = 'http://localhost:5001'
pnpm --filter @pickathrift/fe exec next dev --port 3001
```

Buka `http://localhost:3001/masuk`. Perubahan URL API memerlukan restart frontend; build produksi harus dibuat dengan URL API yang akan digunakan.

## Kontrak dan sesi

| Aksi            | Endpoint                  | Hasil                                                   |
| --------------- | ------------------------- | ------------------------------------------------------- |
| Daftar          | `POST /api/auth/register` | Akun buyer, tanpa token login                           |
| Masuk           | `POST /api/auth/login`    | Token dan pengguna; kirim peran buyer/admin sesuai form |
| Verifikasi sesi | `GET /api/users/me`       | Identitas pengguna berdasarkan Bearer token             |
| Keluar          | Lokal                     | Hapus token dan state sesi browser                      |

Token disimpan di `sessionStorage` agar tersedia saat refresh pada tab yang sama. Identitas diverifikasi melalui `/api/users/me` saat aplikasi dimuat ulang. Profil simulasi lama di localStorage tidak membuat pengguna dianggap login. Bila penyimpanan browser diblokir, sesi hanya bertahan di memori sampai halaman dimuat ulang.

Permintaan API menggunakan `Authorization: Bearer …` tanpa cookie. Respons 401 pada API terlindungi menghapus sesi. Kegagalan jaringan saat verifikasi menampilkan tombol coba lagi tanpa membuang token. Logout bersifat lokal: backend tidak memiliki endpoint pencabutan token. JWT tetap mengikuti masa berlaku backend.

## Verifikasi

- `pnpm --filter @pickathrift/be test`: tes memakai database terisolasi.
- `pnpm --filter @pickathrift/fe test`: mencakup registrasi tanpa sesi palsu, login, Bearer token, pemulihan sesi, logout, 401, kegagalan jaringan, dan respons terlambat setelah logout.
- `pnpm --filter @pickathrift/fe typecheck`, `pnpm lint`, dan `pnpm --filter @pickathrift/fe build`.
- Uji browser: daftar, email duplikat, password salah, masuk, refresh, keluar, akses profil setelah logout, buyer mencoba login admin, serta koneksi API terputus.

Verifikasi 15 November 2026: 254 tes backend dan 73 tes frontend lulus, berikut typecheck, lint, dan build produksi. Alur browser buyer diuji terhadap Atlas; akun uji sudah dihapus. Build produksi juga diuji dengan MongoDB terisolasi: login admin, refresh identitas admin, login ulang dari layar sesi berakhir, dan penolakan token tidak valid berhasil. Token kedaluwarsa tercakup tes backend terisolasi. Kegagalan koneksi disimulasikan dengan membatalkan permintaan login di browser.

Format seluruh file yang diubah lolos. Perintah format seluruh repo masih melaporkan akhir baris CRLF pada checkout Windows serta `docs/aturan-pesanan.md` yang sudah bermasalah di `origin/main`. Perbandingan isi file setelah menyamakan akhir baris menunjukkan tidak ada kegagalan format baru. Perbaikan format seluruh repo tidak menjadi bagian integrasi ini.

Berkas `fe/.env.example` yang sebelumnya terlacak dikeluarkan dari Git, dengan salinan lokal tetap tersedia. Konfigurasi lingkungan dan kredensial tidak masuk commit integrasi.

Satu alamat lama di Atlas dinormalisasi dengan menyimpan teks aslinya pada `legacy_address` dan mengubah `address` menjadi null. Pemeriksaan kesiapan data lolos setelah perubahan dan setelah pembersihan akun uji.

## Batas integrasi

Pekerjaan ini menghubungkan autentikasi. Katalog, penyimpanan alamat/profil, pesanan, pembayaran, dan fitur lainnya belum dinyatakan terhubung ke Atlas oleh pengujian ini. Tampilan profil dapat digunakan untuk melihat sesi dan logout, tetapi pengubahan alamat masih mengikuti implementasi sebelumnya. Tidak ada perubahan endpoint publik backend atau deployment.
