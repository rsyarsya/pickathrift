# Masuk dengan Google (Buyer)

Tombol Google ada di `/masuk` dan `/daftar`, tidak ada di `/admin/masuk`. Desainnya ada di Figma
board A1 Masuk dan A2 Daftar, plus state A1.7 Google gagal.

## Alur

1. Tombol resmi Google Identity Services di FE memberi ID token (`credential`).
2. FE mengirim `POST /api/auth/google` dengan `{ credential }`.
3. BE memverifikasi signature, issuer, audience (`GOOGLE_CLIENT_ID`), dan waktu berlaku token
   dengan `google-auth-library`. Email harus berstatus terverifikasi.
4. BE mencari akun berdasarkan `googleId`, lalu berdasarkan email:
   - belum ada: dibuat sebagai Buyer tanpa kata sandi;
   - Buyer lama dengan email Gmail atau Workspace yang dikelola Google (`hd`): ditautkan,
     kata sandinya tetap berlaku;
   - Buyer lama dengan email pihak ketiga tanpa `hd`: `409 GOOGLE_LINK_REQUIRED`, gunakan
     kata sandi yang sudah dimiliki;
   - Admin: ditolak `403`.
5. Request bersamaan tetap memakai satu akun. Penautan hanya berhasil untuk satu identitas
   Google; request lain tidak diberi sesi jika identitas yang tersimpan berbeda.
6. BE mengembalikan JWT yang sama dengan `/api/auth/login`. Sesi, `sessionStorage`, dan
   `/api/users/me` tidak berubah.

Tanpa `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, tombol Google tidak tampil. Tanpa `GOOGLE_CLIENT_ID`, BE
menjawab `503 GOOGLE_DISABLED`.

Penautan email mengikuti [aturan verifikasi Google](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
`email_verified` saja belum membuktikan kepemilikan email pihak ketiga saat ini. Akun Google
baru tetap boleh memakai email tersebut; pembatasan di atas berlaku saat menautkan akun password
yang sudah ada. Login berikutnya mengenali akun melalui `sub`, bukan mencocokkan ulang nama.

## Langkah manual (sekali saja)

1. Buka [Google Cloud Console](https://console.cloud.google.com/) dan buat project, misalnya
   `PickaThrift`.
2. **APIs & Services → OAuth consent screen** (di konsol baru namanya **Google Auth Platform**):
   - User type **External**.
   - Isi nama aplikasi `PickaThrift`, email dukungan, dan email kontak developer.
   - Scope cukup bawaan (`openid`, `email`, `profile`). Tidak perlu menambah scope.
   - Untuk uji tim, gunakan status **Testing** dan tambahkan email anggota tim serta dosen
     penguji di **Test users** bila diminta konsol.
3. **Credentials → Create credentials → OAuth client ID**:
   - Application type **Web application**.
   - **Authorized JavaScript origins**: `http://localhost:3000`, `http://localhost`, dan domain
     FE kalau sudah deploy (misalnya `https://pickathrift.vercel.app`). Untuk dev di port lain,
     tambahkan juga, misalnya `http://localhost:3001`.
   - **Authorized redirect URIs** dikosongkan. Client secret tidak dipakai.
4. Salin **Client ID** (bentuknya `xxxx.apps.googleusercontent.com`). Nilai ini publik dan
   aman masuk FE, tapi tetap jangan di-commit.
5. Isi env lokal, lalu restart BE dan FE:
   - `be/.env`: `GOOGLE_CLIENT_ID=<client id>`
   - `fe/.env.local`: `NEXT_PUBLIC_GOOGLE_CLIENT_ID=<client id yang sama>`
6. Kalau deploy, isi dua variabel yang sama di hosting BE dan FE, lalu build ulang FE, karena
   `NEXT_PUBLIC_*` ditanam saat build.
7. Kalau koleksi `users` di Atlas sudah ada, BE akan membuat indeks unik `googleId` saat start.
   Tidak ada migrasi data.

## Uji manual

1. `/masuk` → klik tombol Google → pilih akun test user. Harus kembali ke beranda dalam keadaan
   masuk.
2. Keluar, lalu masuk lagi dengan Google. Harus akun yang sama, tidak membuat akun baru.
3. Buyer lama dengan email Gmail yang sama: masuk dengan Google, lalu keluar dan masuk lagi pakai
   kata sandi. Keduanya harus berhasil.
4. `/daftar` → tombol Google → langsung masuk, tanpa layar "Akun dibuat".
5. Email yang dipakai akun Admin: masuk lewat Google harus ditolak.
6. `/admin/masuk` tidak menampilkan tombol Google.

Kalau tombol tidak muncul, cek `NEXT_PUBLIC_GOOGLE_CLIENT_ID` lalu restart FE. Kalau popup
Google menolak dengan pesan _origin not allowed_, tambahkan origin persis (termasuk port) di
langkah 3. Perubahan origin bisa butuh beberapa menit sampai berlaku.

## Batas

- Teks tombol diatur Google sesuai bahasa browser (misalnya "Login dengan Google"), jadi bisa
  sedikit berbeda dari Figma. Lebarnya juga dibatasi Google maksimal 400 px.
- Tes alur akun memakai verifier palsu (`verifyGoogleIdToken` di config tes). Tes token terpisah
  memakai verifier asli dengan public key QA untuk memeriksa signature, audience, issuer,
  kedaluwarsa, dan token rusak. Keduanya tidak membuktikan login ke akun Google sungguhan;
  jalankan uji manual di atas setelah Client ID dan origin disiapkan.
