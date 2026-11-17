# Kontrak API BE — batch 1–6

## Penyimpanan Supabase

`STORAGE_DRIVER=supabase` menyimpan gambar ke bucket private pada `SUPABASE_URL`, memakai
`SUPABASE_SECRET_KEY` server dan `SUPABASE_STORAGE_BUCKET`. Default `local` tetap tersedia
untuk pengembangan/tes. Startup memeriksa akses bucket dan menolak bucket public.

- `POST /api/admin/product-images` tetap mengembalikan `/uploads/products/<filename>`.
  `GET` path tersebut meneruskan gambar dari Supabase melalui BE, tanpa mengekspos key.
- Bukti bayar manual lama tetap di `/api/orders/:id/payment-proof`; akses hanya pemilik/Admin.
  Objek memakai prefix `products/` atau `proofs/` di bucket yang sama. Tidak ada route publik proofs.
- Validasi isi JPG/PNG, batas 2 MiB dan maksimal empat foto tetap berlaku.
- Objek hilang: `404 FILE_UNAVAILABLE`. Storage gagal: `503 STORAGE_UNAVAILABLE`, tanpa
  detail kredensial. Upload gagal tidak beralih ke disk lokal. Upload parsial dibersihkan;
  bila pembersihan juga gagal, BE mencatat pesan tanpa key dan mempertahankan galat awal.
- Peralihan driver tidak memindahkan file lama otomatis. Salin file lama ke prefix dan nama
  yang sama sebelum mengganti driver pada database yang sudah dipakai; simpan backup lokal.

## Midtrans sandbox — batch 3 (FE dan checkout baru)

Runtime dari `getConfig()` hanya membuat checkout gateway: bila `MIDTRANS_ENABLED=false`,
POST `/orders` menghasilkan `503 PAYMENT_UNAVAILABLE` sebelum menulis order/reservasi.
Tidak ada pilihan transfer manual untuk order baru. Fixture tes deployment lama memakai
config tanpa properti Midtrans untuk memverifikasi kompatibilitas order manual.

FE membuka Snap redirect setelah order dan sesi tersimpan. Gagal membuka pembayaran
tidak membuat order kedua: Buyer dapat melanjutkan dari checkout/riwayat. Halaman kembali
ke detail order memanggil endpoint sync; callback URL bukan sumber status. Polling setiap
10 detik saat halaman terlihat dibatasi 12 kali dan berhenti pada status terminal/flag
review. Tenggat memakai yang paling awal dari `expiresAt` dan `providerExpiresAt`.
Admin hanya mengirim gateway yang `settled` tanpa flag review; verifikasi bukti hanya
untuk order manual lama. Uji sandbox nyata tetap memerlukan akun/kanal dan webhook publik.

## Midtrans sandbox — batch 2 (webhook dan rekonsiliasi)

Bagian ini menggantikan pembatasan sementara batch 1. Gateway tetap default nonaktif
sampai FE batch 3 selesai; pengujian memakai database terisolasi.

| Method | Route                             | Akses / hasil                                                                                                                                                                             |
| ------ | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/payments/midtrans/notification` | Publik, JSON Midtrans dengan signature SHA512 valid. Respons 200 `{success:true,data:{received:true}}` setelah hasil tersimpan. Tidak mengembalikan data Buyer.                           |
| POST   | `/orders/:id/payment/sync`        | Buyer pemilik atau Admin, body `{}`. Respons DTO order; maksimal satu percobaan sinkronisasi per 5 detik per order (`429 PAYMENT_SYNC_THROTTLED`).                                        |
| POST   | `/orders/:id/cancel`              | Buyer pemilik; tetap idempotent pada order batal. Sesi/transaksi gateway ditutup dan diperiksa dahulu. Jika pembayaran sudah berhasil: simpan hasil lunas, lalu `409 INVALID_TRANSITION`. |

Konfigurasi BE: `MIDTRANS_SERVER_KEY` adalah key API sandbox. Bila key API tambahan
berbeda dari key utama/default penanda tangan notifikasi, isi juga
`MIDTRANS_NOTIFICATION_KEY` dengan key utama tersebut. Key utama digunakan untuk
signature dan Basic auth penutupan sesi Snap; key API tetap dipakai untuk membuat
sesi, membaca status, dan membatalkan transaksi. Key utama dapat memiliki
awalan `Mid-server-`; semua endpoint provider tetap dikunci ke domain sandbox.
Kedua key hanya berada di BE dan tidak disertakan pada respons/log.

`MIDTRANS_NOTIFICATION_URL` opsional berisi satu URL HTTPS publik ke route notifikasi.
Server meneruskannya sebagai `X-Override-Notification` ketika membuat sesi Snap,
sehingga QA lokal tidak perlu mengubah pengaturan notifikasi global merchant.
Tanpa override, Midtrans memakai URL pada dashboard. URL bukan tempat menyimpan key.

Webhook memeriksa signature dengan perbandingan waktu konstan, merchantOrderId dan
nominal, lalu mengambil status langsung dari Midtrans. Status body webhook/callback
FE tidak menjadi sumber keputusan. Signature tidak mencakup seluruh field webhook,
sehingga GET status juga mencegah replay payload lama yang statusnya diganti.

Status `payment` ditambah `pending`, `settled`, `cancelled`, `expired`, `failed`, dan
`review_required`. DTO menambah `providerStatus`, `checkedAt`, `providerExpiresAt`, dan
`reviewReason` (null bila normal). `paidAt` memakai waktu settlement provider jika ada,
atau waktu konfirmasi server. `providerExpiresAt` memuat tenggat kanal bila tersedia;
FE memakai batas paling awal dari tenggat itu dan `expiresAt` pesanan. Respons sesi
`POST /orders/:id/payment` dapat berstatus `ready` atau `pending` saat digunakan ulang.
Pembatalan oleh provider menambah `cancellation_reason: payment`; pembatalan Buyer dan
kedaluwarsa tetap `buyer/expired`. Token, URL Snap, dan kunci sinkronisasi tetap privat.

- Pending: Menunggu Pembayaran, stok Dipesan. Settlement pada VA/QRIS yang sesuai,
  nominal benar dan fraud_status absent/accept: Diproses + stok Terjual dalam satu
  transaksi MongoDB. Pengiriman/penerimaan/ulasan tidak lagi mensyaratkan bukti manual.
- Cancel/expire/deny/failure baru membatalkan order setelah sesi Snap ditutup dan GET
  status memastikan tidak ada pembayaran berhasil atau pending. Satu percobaan deny
  tidak dianggap terminal untuk seluruh sesi Snap. Tidak menambah retry dengan ID baru.
- `404` sebelum kanal dipilih mempertahankan sesi aktif. Jika token hilang setelah
  respons pembuatan terputus, GET 404 dapat diikuti pembuatan ulang token dengan
  merchantOrderId sama (Midtrans menonaktifkan token lama), masih memakai deadline asli.
- Pembuatan ulang memerlukan sisa minimal lima menit ditambah cadangan request 10 detik.
  Jika token hilang dan waktu tidak cukup untuk memulihkannya, tandai
  `SESSION_UNCONFIRMED` untuk pemeriksaan merchant;
  stok tetap dipesan. Jam lokal, blanket expiry, atau GET 404 tidak menjadi bukti
  penutupan sesi. Pending tetap harus dibatalkan/di-expire dan dikonfirmasi.
  Error jaringan/401 bukan 404.
- Jika status belum pasti, respons 503 `PAYMENT_STATUS_UNKNOWN`, reservasi tetap, dan
  sinkronisasi dapat diulang. Kegagalan satu provider tidak mematikan katalog.
- Pembayaran terlambat pada order batal/kunci stok berbeda, nominal/currency/identitas
  provider berbeda, kanal/status tak didukung atau fraud_status tak aman ditandai
  `review_required`/`reviewReason`; tidak mengambil stok order lain atau boleh dikirim.
  Penanganan kasus tersebut melalui pemeriksaan merchant/Admin; refund otomatis di luar batch.
- Pembayaran berhasil tidak diturunkan oleh pending/cancel lama. Webhook berulang tidak
  menambah versi domain/status berulang. Kunci operasi sementara di DB mencegah proses
  lintas instance berjalan bersamaan; tidak ada request provider di transaksi MongoDB.
  Webhook yang bertabrakan mendapat 503 agar Midtrans mengulangnya.

Kedaluwarsa gateway diperiksa juga saat membaca katalog/detail, pencocokan, wishlist,
pesanan, dan checkout. Retry otomatis dari pembacaan dibatasi 5 detik; pembacaan
tetap berjalan bila provider gagal. Tidak menambah cron. Sesi yang sedang dibuat
tidak dibatalkan sebelum responsnya pasti atau batas request terlewati.

Referensi: [webhook dan status](https://docs.midtrans.com/docs/https-notification-webhooks),
[batal transaksi](https://docs.midtrans.com/reference/cancel-transaction),
[batal sesi Snap](https://docs.midtrans.com/reference/cancel-a-snap-session),
[blanket expiry](https://docs.midtrans.com/reference/expire-a-snap-session).

## Midtrans sandbox — batch 1 (fondasi, belum diaktifkan untuk FE)

Batch ini menambahkan pembuatan sesi Snap. Webhook, sinkronisasi pembayaran, dan FE
menyusul pada batch 2–3. `MIDTRANS_ENABLED` default `false`: jangan aktifkan pada
database bersama sebelum tiga batch selesai. Dalam keadaan nonaktif, checkout lama
tetap manual. Jika diaktifkan pada lingkungan uji terisolasi, semua order baru
menggunakan Midtrans; request tidak dapat memilih metode manual.

Konfigurasi BE lokal: `MIDTRANS_ENABLED=true`, `MIDTRANS_SERVER_KEY` sandbox, serta
`FRONTEND_URL` (origin FE, misalnya `http://localhost:3000`). Semua konfigurasi dan
contoh `.env` tetap lokal. URL API Midtrans dikunci ke sandbox; tidak ada mode produksi.
Frontend tidak menerima Server Key atau memerlukan Client Key untuk mode redirect.

| Method | Route                 | Akses         | Body / hasil                                                                                                                                                  |
| ------ | --------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/orders/:id/payment` | Buyer pemilik | Body `{}`. `201` sesi baru, `200` sesi tersimpan; `data: {provider: "midtrans", status: "ready", merchantOrderId, redirectUrl, expiresAt, sessionExpiresAt}`. |

DTO order menambahkan `payment: {provider, status, merchantOrderId, channel, paidAt}`.
Order tanpa metadata gateway dibaca sebagai `{provider: "manual", status: null,
merchantOrderId: null, channel: null, paidAt: null}` tanpa menulis ulang data lama.
Token dan URL Snap tidak disertakan pada daftar/detail order; URL hanya lewat endpoint
pembayaran milik Buyer. Status pembuatan sesi: `not_started`, `creating`, `ready`,
atau `unknown`; status ini terpisah dari status order/pengiriman.

BE menyimpan satu merchantOrderId sebelum request provider, mengunci pembuatan sesi
secara atomik, lalu memanggil Midtrans di luar transaksi MongoDB. Request serentak
yang belum selesai mendapat `409 PAYMENT_IN_PROGRESS`; request berikutnya menggunakan
sesi yang sama. Tidak ada retry otomatis untuk respons timeout/galat/malformed atau
proses yang terhenti: state menjadi `unknown`, respons `503 PAYMENT_STATUS_UNKNOWN`,
dan ID tidak diganti. Pemulihan melalui rekonsiliasi batch 2, bukan membuat ID baru.
Galat provider dan kredensial tidak diteruskan ke respons klien.

Payload mengaktifkan `bca_va`, `bni_va`, `bri_va`, `permata_va`, `echannel`, dan
`other_qris`. Kanal yang benar-benar tampil tetap perlu diverifikasi di akun sandbox.
Harga, penerima, ongkir, total, dan batas waktu berasal dari snapshot order.
`expiry.start_time` mengacu pada pembuatan order dengan durasi 360 menit. Page expiry
memakai sisa menit penuh dengan cadangan timeout request 10 detik agar tidak melewati
deadline; halaman dapat berakhir sedikit lebih awal. Sesi tidak dibuat ketika sisa
waktu kurang dari lima menit ditambah cadangan 10 detik (`409 PAYMENT_WINDOW_TOO_SHORT`);
deadline enam jam tidak diperpanjang. Sesi yang melewati `sessionExpiresAt` menghasilkan
`409 PAYMENT_SESSION_EXPIRED`, bukan sesi baru.

Sampai rekonsiliasi tersedia, reservasi dengan sesi `creating/ready/unknown` tidak
dilepas otomatis dan pembatalannya ditolak `409 PAYMENT_CHECK_REQUIRED`. Order gateway
yang belum pernah memulai sesi masih bisa dibatalkan/kedaluwarsa. Unggah bukti dan
persetujuan manual ditolak pada semua order gateway. Ini pembatasan sementara batch 1,
bukan alur final. Gateway nonaktif memberi `503 PAYMENT_UNAVAILABLE`; metode manual,
order bukan Menunggu Pembayaran, atau kunci stok berubah memberi `409`. Aturan
401/403/404/422 tetap berlaku. Semua respons endpoint sesi memakai `Cache-Control: no-store`.

Referensi: [Snap](https://docs.midtrans.com/docs/snap-snap-integration-guide),
[kanal pembayaran](https://docs.midtrans.com/reference/request-body-json-parameter),
[expiry dan page expiry](https://docs.midtrans.com/reference/json-objects).

## Perbaikan QA pembayaran

DTO order menyertakan `version` (integer). Semua POST `/api/admin/orders/:id/actions`
wajib mengirim `version` dari order yang sedang dilihat, selain field tindakan yang
sudah ada. Versi yang tidak lagi sama menghasilkan `409 STALE_ORDER`; versi hilang/
tipe salah menghasilkan 422. Setelah refresh, Admin tetap boleh approve/reject dari
Perlu Unggah Ulang. Perubahan kontrak ini mencegah dua layar Admin menimpa keputusan
yang dibuat pada versi sama, meski proofId belum berubah.

Approve tetap mensyaratkan file bukti dapat dibaca. Reupload/reject boleh dilakukan
oleh Admin jika file hilang, tetap dengan proofId, version, catatan dan kunci stok
yang benar. Metadata bukti dipertahankan dengan `proof.unavailable: true`. Guard
startup menerima penanda ini hanya pada Perlu Unggah Ulang dengan catatan Admin atau
Dibatalkan oleh Admin dengan catatan; kehilangan file yang belum ditangani tetap
menjadi blocker. Upload pengganti menghasilkan proofId baru dan menghapus penanda.
Galat download bukti menggunakan application/json; gambar sukses tetap MIME gambar.

## Ulasan (batch 6)

POST `/api/orders/:id/review` khusus Buyer pemilik pesanan Selesai. Body tetap
`{rating, comment}`: rating bilangan bulat 1–5, comment teks setelah trim sepanjang
10–500 karakter. Field asing/tipe salah 422; bukan pemilik/Admin 403, tanpa token
401, resource hilang 404, belum Selesai 409 ORDER_NOT_COMPLETED. Ulasan kedua
termasuk request bersamaan 409 REVIEW_EXISTS; unique index per order menjaminnya.
Respons 201 memakai DTO ulasan lama.

GET `/api/reviews` publik mengembalikan data array terbaru lalu ID, hanya
`{id,author,rating,comment,createdAt}` tanpa order_id, ID Buyer, email, alamat atau
data pembayaran. Nama penulis mengikuti nama profil. Order pada detail/daftar
menambah `review` berupa ringkasan ulasan atau null agar eligibility dapat diketahui
FE; tidak mengembalikan dokumen database mentah.

Startup/migrasi memeriksa review lama: duplikat per order, rating/isi tidak valid,
pemilik/referensi rusak, atau order belum Selesai menjadi blocker. Tidak menghapus
atau mengarang ulasan otomatis.

## Pembayaran, berkas dan pengiriman (batch 5)

## Acuan dan aturan yang dikunci

Acuan utama: FE pada commit sumber yang sama, terutama
fe/src/modules/orders/order.ts, fe/src/modules/admin/orderActions.ts, dan
docs/aturan-pesanan.md. Google Docs melengkapi, bukan mengganti aturan FE terbaru.

- Bukti: satu JPG/PNG, tidak kosong, maksimal 2 MiB. Periksa decoding gambar, bukan
  percaya ekstensi/MIME. Nama asli hanya untuk tampilan; nama file server acak.
- Menunggu Pembayaran -> unggah sebelum deadline -> Menunggu Verifikasi.
- Menunggu Verifikasi -> Admin approve -> Diproses; reupload -> Perlu Unggah Ulang;
  reject -> Dibatalkan. Reupload/reject wajib catatan tidak kosong, maksimal 500 karakter.
- Perlu Unggah Ulang -> Buyer unggah -> Menunggu Verifikasi. Mengikuti FE, Admin juga
  boleh approve/reject bukti yang masih ada dari Perlu Unggah Ulang; tidak boleh
  meminta ulang lagi dari status tersebut. Batas enam jam awal tidak diperpanjang dan
  tidak membatalkan status verifikasi/unggah ulang.
- Approve mengubah produk reserved menjadi sold dan mengosongkan reservation_order_id.
  Reject melepaskan stok hanya bila kunci masih milik order tersebut, alasan cancel admin.
  Kedua perubahan order/produk berada dalam satu transaksi; konflik kunci 409 tanpa
  mengubah pemilik lain. Semua transisi lain ditolak 409.
- Diproses -> Admin kirim dengan kurir dan resi -> Dikirim -> Buyer pemilik terima ->
  Selesai. Kurir mengikuti FE: JNE REG, J&T EZ, SiCepat REG, POS Kilat. Resi 8–30
  karakter huruf/angka/spasi/tanda hubung, wajib memiliki huruf atau angka. Tidak
  menyalin celah FE yang menerima resi berisi tanda hubung saja.
- Tidak membuat alur refund, payment gateway, cron, atau unggah ulang setelah Diproses.

## Endpoint batch 5

Base /api. Sukses/galat JSON tetap memakai envelope saat ini; endpoint gambar mengirim
binary dengan MIME gambar. Timestamp server dalam ISO string; akses Bearer JWT.

| Method | Route                     | Input / hasil dan akses                                                                                                                                                                                              |
| ------ | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | /orders/:id/payment-proof | Buyer pemilik; multipart satu field file. Dipakai untuk upload awal/ulang. Hasil DTO order.                                                                                                                          |
| GET    | /orders/:id/payment-proof | Buyer pemilik/Admin; gambar bukti terbaru. Tanpa token 401, akun lain 403, belum ada bukti 404. Tidak ada URL publik/token pada query.                                                                               |
| POST   | /admin/orders/:id/actions | Admin; JSON version + type approve/reupload/reject dengan proofId yang sedang diperiksa; reupload/reject juga note. Untuk ship: version, type ship, service, number. Hasil DTO order.                                |
| POST   | /orders/:id/receive       | Buyer pemilik, JSON {}. Hanya Dikirim -> Selesai; submit ulang 409 tanpa mengubah receivedAt.                                                                                                                        |
| GET    | /admin/orders             | Tambah filter status, page/limit (default 1/20, max 100), urutan terbaru+ID. Pertahankan data array; tambah metadata root total, counts per status, page, limit, totalPages. Counts tidak terpengaruh filter status. |
| POST   | /admin/product-images     | Admin; multipart field images, 1–4 JPG/PNG. Default maksimal 2 MiB per gambar. Mengembalikan array path publik; urutan pertama foto utama.                                                                           |

GET /orders/:id yang sudah ada tetap dipakai untuk detail Buyer/Admin. Endpoint PATCH
/admin/orders/:id/status lama tetap 409; tidak dibuka kembali untuk perubahan bebas.
400 bukan pengganti respons validasi proyek: field/file salah 422, transisi konflik
409, akun salah 403, ID buruk 422, resource hilang 404. JSON berukuran terlalu besar
tetap 413; file melebihi batas upload mengikuti kontrak FE 422.

DTO order menambah proof {id,name,mime,size,uploadedAt,url}, adminNote, verifiedAt,
shipment {service,number,shippedAt}, receivedAt. Internal path tidak diekspos. Model
cancellation_reason ditambah admin. Pembacaan bukti melalui fetch berautentikasi saat
integrasi FE kelak; tidak menyisipkan JWT ke URL gambar.

## Pesanan dan stok (batch 4)

Pemeriksaan data lama menolak `expiresAt <= createdAt`. Khusus status Menunggu
Pembayaran (termasuk `pending` lama), selisihnya wajib tepat enam jam. Deadline yang
tidak sesuai menjadi blocker migrasi, tanpa ditulis ulang otomatis. Status verifikasi,
unggah ulang, dan sesudahnya tetap tidak terkena pembatalan berdasarkan deadline awal.

POST `/api/orders` khusus Buyer menerima `product_id` dan `address` opsional (objek
lengkap sesuai batch 3). Tanpa address, gunakan alamat profil; belum lengkap => 422.
Server menentukan buyer, harga, ongkir 15000, total, dan expiresAt = createdAt +6 jam.
Body dengan harga/status/Buyer/waktu atau field lain ditolak 422. Hasil 201 berupa
DTO order: field lama tetap, ditambah `item_price`, `shipping_fee`, `address_snapshot`,
`expiresAt`, `cancelledAt`, dan `cancellation_reason` (buyer/expired atau null).
`total_price` sekarang termasuk ongkir (perubahan kontrak). Salinan alamat dan produk
tidak mengikuti perubahan data profil/katalog. ID pemegang stok tidak diekspos publik.

Status wire sesuai FE: MENUNGGU_PEMBAYARAN, MENUNGGU_VERIFIKASI, PERLU_UNGGAH_ULANG,
DIPROSES, DIKIRIM, SELESAI, DIBATALKAN. Batch ini hanya membuat Menunggu Pembayaran
dan membatalkannya. Endpoint PATCH `/api/admin/orders/:id/status` lama tetap mengenali
akses/ID/resource, tetapi perubahan bebas ditolak 409 TRANSITION_UNAVAILABLE.

POST `/api/orders/:id/cancel` dengan body `{}` khusus Buyer pemilik. Hanya Menunggu
Pembayaran boleh batal; status lain 409, akun lain 403, Admin 403, tidak ditemukan 404.
Order yang sudah Dibatalkan mengembalikan 200 dengan kondisi tersimpan tanpa efek ulang.
Sesudah tepat expiresAt, pembatalan tercatat sebagai expired, bukan buyer.

Pembuatan order, reservasi, pembatalan dan pelepasan stok memakai transaksi replica set.
Produk hanya dilepas jika masih reserved oleh ID order tersebut. Dua request pemesanan
barang sama => satu 201, satu 409 STOCK_CONFLICT. Tidak ada jaminan replay respons 201:
submit ulang selama barang terkunci ditolak 409, bukan membuat order tambahan.
Kedaluwarsa diselesaikan saat membaca produk/order/wishlist, pencocokan, edit produk,
atau membuat/membatalkan order. Hanya Menunggu Pembayaran terkena batas awal enam jam.
Tidak memakai cron; data mentah dapat tetap reserved sampai request pemicu berikutnya.
MongoDB standalone ditolak saat startup dengan REPLICA_SET_REQUIRED sebelum listen.
Data lama wajib dry-run migrasi; informasi alamat/ongkir yang tidak diketahui menjadi
blocker dan tidak diisi dari profil Buyer sekarang. Lihat MIGRATION.md.

## Pencocokan, wishlist, dan alamat (batch 3)

`POST /api/products/match` publik mengganti body lama (`clothing_type`, `max_budget`)
dengan `category` wajib; `style`, `size`, `minPrice`, `maxPrice`, dan
`measurements: [{label, cm}]` opsional. Pilihan mengikuti produk/kategori; pengukuran
positif hingga 200 cm, tanpa label duplikat. Harga bilangan bulat rupiah tidak negatif,
min <= max. Field lama/asing ditolak 422. Hanya produk aktif dan available.
Semua ukuran yang diminta harus tersedia dan selisih <=2 cm. Respons `data` berupa
array `{product, diffCm}`; tanpa pengukuran diffCm=0. Urutan total selisih terkecil,
createdAt terbaru, lalu ID menurun. Hasil kosong tetap 200 dengan array kosong.
Perbandingan batas dan hasil seri mengabaikan galat representasi floating point yang
sangat kecil; selisih desimal tepat 2 cm tetap lolos, selisih nyata di atas 2 cm ditolak.

Wishlist tetap memakai GET `/api/wishlist` dan POST/DELETE `/api/wishlist/:productId`,
khusus Buyer sendiri. POST produk hilang/nonaktif 404; duplikat termasuk request
bersamaan 409. Produk Dipesan/Terjual boleh disimpan. GET mengembalikan item
`{id, productId, product_id, unavailable, createdAt}`. Produk aktif menggunakan DTO produk;
produk yang nonaktif/hilang menggunakan `product_id: null, unavailable: true`.
`productId` tetap tersedia untuk DELETE, termasuk produk yang kemudian tidak tersedia.

`address` pada registrasi opsional, GET/PATCH `/api/users/me`, dan respons auth
sekarang berupa null (belum diisi) atau objek lengkap
`{recipient, phone, street, city, postalCode}`. PATCH alamat mengganti seluruh objek;
null/string/objek parsial ditolak 422. Semua teks di-trim. recipient dan city 2–100
karakter, wajib ada huruf, tanpa angka/simbol (boleh `. , ' -`, city juga boleh kurung);
street 8–1000 karakter; nomor HP 10–13 digit diawali 08, dan input `+62…`/`62…` beserta
pemisah spasi/kurung/titik/tanda hubung diseragamkan menjadi `08…`; kode pos lima digit
tidak diawali 0. Aturan ini berlaku untuk input baru (registrasi, PATCH profil, alamat
di body pesanan). Alamat profil yang sudah tersimpan dan pemeriksaan data lama memakai
aturan lama agar data lama tidak ikut ditolak. Nama akun tetap terpisah dari penerima.
Nomor `phone` tingkat akun tetap field terpisah sesuai kontrak sebelumnya.
Alamat lama dipindah ke `legacy_address` internal melalui migrasi eksplisit; tidak
ditampilkan melalui API dan tidak dipakai checkout. Lihat MIGRATION.md.
Migrator melaporkan wishlist duplikat, pemilik bukan Buyer/hilang, serta produk
yang sudah hilang sebagai blocker sebelum unique index dipasang.

Baseline: `5c506d1`. Batch ini menangani akses, validasi dasar, dan respons galat.
Batch 2 melengkapi produk dan katalog berdasarkan FE di `185ee54`. Batch 3 melengkapi alamat terstruktur, wishlist dan pencocokan ukuran. Batch 4 melengkapi transaksi stok, pembatalan dan expiry.
Pembayaran, pengiriman, serta aturan ulasan lengkap masih menyusul.
BE secara keseluruhan belum siap produksi.

## Produk dan katalog (batch 2)

Produk sekarang menggunakan `name` (menggantikan `title`), `brand`, `category`, `size`,
`condition`, `style`, `color`, `price`, `images` (menggantikan `image_url`),
`measurements: [{label, cm}]`, `status`, `active`, `id`, `createdAt`, dan `updatedAt`.
`clothing_type` dihapus dari produk; jenis pakaian diwakili `category`.

| Method | Route                 | Akses  | Hasil                                                                          |
| ------ | --------------------- | ------ | ------------------------------------------------------------------------------ |
| GET    | `/products`           | Publik | `data: {items, total, counts, page, limit, totalPages}`. Hanya produk aktif.   |
| GET    | `/products/:id`       | Publik | Satu produk aktif; nonaktif/tidak ditemukan `404`.                             |
| GET    | `/admin/products`     | Admin  | Bentuk halaman sama; mencakup aktif/nonaktif.                                  |
| GET    | `/admin/products/:id` | Admin  | Detail termasuk produk nonaktif.                                               |
| POST   | `/products`           | Admin  | Input produk lengkap, `201`; selalu Tersedia dan aktif.                        |
| PATCH  | `/products/:id`       | Admin  | Sebagian field produk atau `active` boolean; hasil produk setelah perubahan.   |
| DELETE | `/products/:id`       | Admin  | Menetapkan `active: false`, tanpa menghapus dokumen atau mengubah status stok. |

Input POST wajib: `name`, `brand`, `category`, `size`, `condition`, `style`, `price`,
`images`. `color` default string kosong; `measurements` default array kosong.
PATCH menerima field yang sama dan `active`; menolak field lain, termasuk ID, waktu,
operator MongoDB, dan status stok. Harga bilangan bulat rupiah minimal 1000.
Nama maksimal 200 karakter, merek 100, warna 100. Nilai teks di-trim.

- Kategori: Jaket, Kaos, Kemeja, Celana. Gaya: Kasual, Workwear, Vintage, Formal.
- Kondisi mengikuti empat pilihan FE: Baru dengan tag, Sangat baik, Baik, Memuaskan.
- Ukuran atasan: XS/S/M/L/XL; Celana: 27/28/29/30/31/32/33/34/36 (string).
- Foto 1–4 referensi HTTP(S) atau path publik lokal absolut (`/images/...`), urutan
  pertama adalah foto utama. Data URL, Blob URL, dan path file komputer ditolak.
  Upload fisik lokal akan ditambahkan pada batch berkas; validasi ini belum memeriksa isi foto.
- Pengukuran opsional, tidak boleh ada label duplikat. Nilai harus angka `>0` dan `<=200` cm.
  Atasan: Lebar dada, Panjang, Bahu, Lengan. Celana: Pinggang, Panjang, Lebar paha, Lebar bawah.
  Perubahan kategori wajib menghasilkan ukuran dan pengukuran yang valid untuk kategori baru.
- Produk Terjual menolak semua edit. Produk Dipesan menolak perubahan harga/ukuran label
  dan penonaktifan (`409`); pengiriman ulang nilai harga/ukuran yang sama diperbolehkan.
  Hanya produk Tersedia boleh diaktifkan/dinonaktifkan. Konflik perubahan bersamaan `409`.

Query katalog memakai nama properti `CatalogQuery` FE, bukan nama parameter URL halaman FE:

| Parameter              | Aturan                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `q`                    | Pencarian substring nama atau merek, tidak peka huruf besar/kecil, teks literal.                                |
| `category`             | Satu kategori valid.                                                                                            |
| `sizes`, `conditions`  | CSV atau parameter berulang; OR dalam satu filter, AND antar filter. Ukuran Celana didukung.                    |
| `minPrice`, `maxPrice` | Angka finite tidak negatif; batas inklusif dan min tidak boleh melebihi max.                                    |
| `availableOnly`        | `true/false`, default `false`; default mencakup Tersedia, Dipesan, Terjual.                                     |
| `sort`                 | `terbaru` (default), `termurah`, `termahal`. Harga sama diurutkan terbaru, kemudian ID sebagai pembeda.         |
| `page`, `limit`        | Bilangan bulat positif; default 1 dan 12, limit maksimal 100. Halaman melewati hasil menghasilkan items kosong. |
| `status`, `active`     | Hanya pada daftar Admin: filter status stok dan boolean aktif. Tanpa filter mencakup semua.                     |

`total` menghitung hasil semua filter sebelum pagination. `counts` berisi Semua/Jaket/Kaos/
Kemeja/Celana tanpa filter pencarian dan filter lain; publik hanya menghitung produk aktif,
Admin menghitung seluruh produk. Parameter asing/berulang yang tidak didukung menghasilkan `422`.
Nama query lama seperti `search`, `min_price`, dan `price_asc` tidak lagi diterima.
Urutan `terbaru` pada daftar Admin memakai waktu edit (`updatedAt`), mengikuti FE Admin;
katalog publik memakai waktu penambahan (`createdAt`).

Kontrak lengkap `POST /products/match` sekarang mengikuti bagian batch 3 di atas.

Pesanan baru menyimpan `product_snapshot`. Respons `product_id` pesanan memakai salinan
tersebut, sehingga edit/penonaktifan produk tidak mengubah informasi riwayatnya.
Pesanan lama tanpa salinan perlu migrasi sebelum startup. Respons menambahkan
`product_snapshot_source`: `checkout` untuk pesanan baru atau `legacy-current-product`
untuk salinan berdasarkan data saat migrasi; lihat [MIGRATION.md](MIGRATION.md).
Pemesanan produk nonaktif ditolak. Transaksi dan pemulihan stok mengikuti kontrak batch 4 di atas.
Tidak ada migrasi database tim otomatis. Startup menolak data yang belum kompatibel
dan mengarahkan ke dry-run `migrate:legacy`; tidak ada fallback yang menebak ukuran,
foto, atau kondisi. Apply hanya dijalankan secara eksplisit, bukan saat startup.

## Aturan umum

- Base URL lokal: `http://localhost:5000/api`.
- JSON sukses: `{ "success": true, "data": ... }`; bentuk `data` dijelaskan per endpoint.
- JSON galat: `{ "success": false, "code": "...", "message": "...", "errors"?: {...} }`.
- Data menggunakan `id` string, tanpa `_id`, `__v`, hash sandi, atau dokumen database mentah.
  Field domain lama seperti `product_id` tetap dipakai sampai batch domain terkait.
- Route privat membutuhkan `Authorization: Bearer <token>`.
- `401`: token hilang/salah/kedaluwarsa, akun sudah dihapus, atau kredensial salah.
  `403`: peran salah atau bukan pemilik data. `404`: resource tidak ada.
  `409`: duplikat/konflik. `422`: input atau ID bukan ObjectId 24 karakter heksadesimal.
- JSON rusak menghasilkan `422`; body terlalu besar `413`; encoding/charset tidak didukung
  menghasilkan `415 UNSUPPORTED_MEDIA_TYPE`; galat internal tidak memuat detail database.
- Token Buyer berlaku 24 jam dan Admin 2 jam. Peran diambil ulang dari database pada setiap
  request privat. Belum ada endpoint pencabutan token/logout server.

## Auth dan profil

| Method | Route            | Akses      | Body / hasil                                                                                                               |
| ------ | ---------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/register` | Publik     | `name`, `email`, `password`; opsional `confirmPassword`, `phone`, `address`. Hasil `201`, `data` pengguna Buyer.           |
| POST   | `/auth/login`    | Publik     | `email`, `password`, opsional `role: buyer/admin` untuk memeriksa halaman masuk yang dipilih. Hasil `data: {token, user}`. |
| POST   | `/auth/google`   | Publik     | `credential` (ID token Google). Masuk atau daftar Buyer. Hasil `data: {token, user}`, sama seperti login.                  |
| GET    | `/users/me`      | Akun aktif | `data` profil akun dari token.                                                                                             |
| PATCH  | `/users/me`      | Akun aktif | Hanya `name`, `phone`, `address`; minimal satu field. `address` mengikuti objek lengkap pada bagian batch 3.               |

Email di-trim dan dijadikan huruf kecil. Nama tidak kosong, maksimal 100 karakter; email
maksimal 254 karakter dengan format `nama@domain.tld`. Sandi registrasi minimal 8 karakter
dan maksimal 72 byte UTF-8 (batas bcrypt); sandi tidak di-trim. Login tidak memaksakan
minimal 8 karakter agar kredensial lama tetap dapat diperiksa. `confirmPassword`, bila
dikirim, harus cocok. Field `role` saat registrasi diabaikan: hasil selalu Buyer.
Registrasi duplikat, termasuk request bersamaan, menghasilkan `409 EMAIL_EXISTS`.
`phone` akun opsional (string kosong menghapus) dengan aturan nomor HP yang sama dengan alamat.
PATCH `name` mengikuti aturan nama penerima. Aturan alamat mengikuti bagian batch 3.
PATCH profil tidak menerima email, password, role, ID, ataupun operator MongoDB.

`/auth/google` aktif kalau `GOOGLE_CLIENT_ID` terisi; tanpa itu jawabannya `503 GOOGLE_DISABLED`.
Signature, issuer, audience (`GOOGLE_CLIENT_ID`), dan waktu berlaku token diperiksa; email harus
terverifikasi. Kegagalan menghasilkan `401 GOOGLE_TOKEN_INVALID`. Akun baru dibuat sebagai Buyer
tanpa kata sandi. Akun Buyer lama hanya ditautkan otomatis jika email terverifikasi berupa Gmail,
atau token Workspace memiliki `hd`; kata sandinya tetap berlaku. Email pihak ketiga tanpa `hd` pada
akun password lama menghasilkan `409 GOOGLE_LINK_REQUIRED` dengan arahan masuk memakai kata sandi.
Login pertama bersamaan dengan identitas sama tetap memakai satu akun; identitas berbeda tidak
dapat memperoleh sesi lewat penautan yang kalah race. Email Admin ditolak `403 ROLE_MISMATCH`.
Akun Google tanpa kata sandi yang mencoba `/auth/login` mendapat `401 INVALID_CREDENTIALS` yang
sama seperti sandi salah.

## Akses endpoint domain yang sudah ada

| Method              | Route                        | Akses / catatan                                                                                       |
| ------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| GET                 | `/products`, `/products/:id` | Publik; kontrak batch 2 di atas.                                                                      |
| POST                | `/products/match`            | Publik; body pencocokan batch 3.                                                                      |
| POST, PATCH, DELETE | `/products`, `/products/:id` | Admin; POST hanya route koleksi.                                                                      |
| GET                 | `/wishlist`                  | Buyer, hanya milik sendiri.                                                                           |
| POST, DELETE        | `/wishlist/:productId`       | Buyer, hanya milik sendiri.                                                                           |
| POST                | `/orders`                    | Buyer; `product_id`, alamat opsional, transaksi batch 4.                                              |
| GET                 | `/orders/my`                 | Buyer, hanya milik sendiri.                                                                           |
| GET                 | `/orders/:id`                | Buyer pemilik atau Admin.                                                                             |
| GET                 | `/admin/orders`              | Admin.                                                                                                |
| PATCH               | `/admin/orders/:id/status`   | Admin; perubahan bebas ditutup dengan 409 hingga batch 5.                                             |
| POST                | `/orders/:id/review`         | Buyer pemilik; `rating` bilangan bulat 1–5 dan `comment` 10–500 karakter, Selesai dan satu per order. |
| GET                 | `/reviews`                   | Publik; nama penulis tanpa email/ID akun.                                                             |

Alias tidak sengaja seperti `/api/:id` dan `/api/orders/admin/orders` dihapus.
ID valid yang tidak ditemukan menghasilkan `404`, termasuk edit/hapus produk dan hapus wishlist.
Filter tunggal menolak array/objek; `sizes` dan `conditions` mendukung nilai berulang.
Angka harga harus finite dan tidak negatif.
Pencarian diperlakukan sebagai teks literal, bukan ekspresi reguler dari pengguna.
PATCH produk mengikuti validasi dan pembatasan batch 2.

## Pengujian

Jalankan `npm test` dari `be`. Tes menggunakan HTTP sungguhan dan MongoDB sementara
terisolasi; tidak membaca `.env` atau database tim. Tes mencakup login Buyer/Admin,
eskalasi peran, email duplikat bersamaan, token, kepemilikan, validasi, route publik,
serta server yang gagal memulai karena konfigurasi/database tidak tersedia.
