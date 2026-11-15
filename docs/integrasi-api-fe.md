# Integrasi API FE — daftar tugas

Status 16 November 2026. Branch kerja: `feat/api-integration` (dibuat dari `main` sesudah PR #21).
Auth (login, daftar, sesi, `/users/me`) sudah terintegrasi oleh rsyarsya — lihat
[auth-integration.md](auth-integration.md). Langkah 0–7 sudah diimplementasikan.
Kontrak lengkap BE ada di [`be/API.md`](../be/API.md).

## Aturan kerja (wajib)

- **Jangan commit dan jangan push.** Pemilik repo yang commit sendiri. Siapkan pesan commit
  (bahasa Inggris, conventional commits) sebagai teks saja.
- **Tanpa jejak AI** di pesan commit, PR, atau kode: tidak ada `Co-Authored-By`, "Generated
  with …", atau menyebut AI.
- **Jangan `git add .` / `-A`.** Ada file yang hanya beda akhir baris (CRLF) dan file kerja lain
  yang bukan bagian tugas ini (`package.json` root, `pnpm-lock.yaml`, `scripts/`, `video/`,
  `video-en/`). Tambahkan file per path.
- `fe/next-env.d.ts` berubah sendiri saat `next dev`; jangan di-commit.
- Satu commit per langkah di bawah. Setelah tiap langkah: `pnpm lint`,
  `pnpm --filter @pickathrift/fe typecheck`, `pnpm --filter @pickathrift/fe test`, lalu cek di
  browser. (Lint gagal di `scripts/voiceover.mjs` bukan bagian tugas ini.)
- Kode/variabel bahasa Inggris, teks layar bahasa Indonesia, rute Indonesia. Ikuti pola modul
  yang ada: komponen tidak memanggil `fetch`, hanya fungsi di `modules/*/data/*.ts`.
- Pertahankan state layar yang sudah ada (memuat, kosong, galat, konflik 409, offline).
  `?demo=` boleh dihapus untuk data yang sudah dari API (langkah 7), tapi jangan rusak tampilan
  state-nya.

## Menjalankan lokal

1. `be/.env` sudah ada (lokal, di-ignore git). `MONGODB_URI` memakai format standar
   `mongodb://host1,host2,host3/...` — **jangan ganti ke `mongodb+srv://`**: DNS lokal laptop
   (127.0.0.1) menolak lookup SRV dari Node.
2. `pnpm --filter @pickathrift/be dev` → port 5000. `pnpm --filter @pickathrift/fe dev` → 3000.
3. FE memakai `API_URL` bawaan `http://localhost:5000`; path API ditulis lengkap dengan `/api`,
   contoh `api("/api/products")`.
4. Database = **database tim**. Data uji yang sudah ada: Admin Uji
   (`admin.uji@pickathrift.test`), Buyer Uji (`buyer.uji@pickathrift.test`), 9 produk dari
   fixtures (semua Tersedia). Password ada di `be/.env` (`ADMIN_PASSWORD`, `QA_BUYER_PASSWORD`).
   Data uji baru beri label jelas (`@pickathrift.test`, nama "Uji").

## Fondasi yang sudah ada

- `fe/src/lib/api.ts`: kirim `Authorization: Bearer` otomatis, 401 menghapus token, galat →
  `ApiError(status, message, code?, errors?)`. `apiData<T>()` membuka bungkus `{ success, data }`;
  `apiBlob()` membaca berkas privat dengan autentikasi dan penanganan galat yang sama.
  Pemanggil auth lama tetap memakai tipe `Envelope<T>` dan `.data`.
- Token di `sessionStorage` (sesi per tab) — masih dikonfirmasi ke rsyarsya apakah disengaja.

## Langkah 0 — Fondasi kecil (sebelum modul)

- [x] Tambah `code?: string` (dan `errors`) ke `ApiError`, isi dari body galat BE.
- [x] Helper kecil untuk envelope, mis. `apiData<T>(path, init)` yang mengembalikan `.data`.
- [x] `next.config.ts`: izinkan gambar dari `http://localhost:5000/uploads/products/**`
      (`images.remotePatterns`). Foto fixtures di `/products/*.jpg` tetap dari FE.
- [ ] Commit: `feat(fe): expose API error codes and unwrap response envelope`

## Langkah 1 — Katalog dan detail produk (kamu)

File: `modules/catalog/data/products.ts` (`listProducts`, `getProduct`, `listProductsByIds`,
`reserveProduct`), `modules/catalog/query.ts`.

- [x] `listProducts` → `GET /api/products` dengan nama properti `CatalogQuery`: `q`, `category`,
      `sizes`, `conditions` (CSV), `minPrice`, `maxPrice`, `availableOnly`, `sort`
      (`terbaru|termurah|termahal`), `page`, `limit`. Respons `data: {items, total, counts,
    page, limit, totalPages}`. Parameter asing → 422, jadi kirim hanya yang terisi.
      "Muat lebih banyak" boleh tetap menaikkan `limit` (maks 100) atau pakai `page`.
- [x] `getProduct(id)` → `GET /api/products/:id`; 404 → state "Barang tidak ditemukan".
      ID sekarang ObjectId 24 heksa; ID buruk → 422, perlakukan seperti 404.
- [x] `listProductsByIds` (Meja Perbandingan, tray) → panggil `getProduct` per id, lewati yang 404.
- [x] `reserveProduct` dihapus/diganti: konflik stok sekarang datang dari `POST /api/orders` (409).
- [x] Hapus pemakaian `applyOrderStock`/IndexedDB untuk status stok katalog — status dari BE.
- [x] Beranda (`WeeklyEdit`) memakai `listProducts` yang sama → otomatis ikut.
- [ ] Commit: `feat(fe): load catalog and product detail from API`

Validasi langkah 0–1 (16 November 2026): typecheck dan 85 tes FE lulus; lint FE lulus.
`pnpm lint` masih gagal hanya pada 7 galat `scripts/voiceover.mjs` di luar tugas.
Pemeriksaan HTTP lokal memastikan katalog (9 produk, 6 per halaman), filter kategori/stok,
detail, dan hasil kosong sesuai kontrak. Pemeriksaan visual browser belum selesai karena
alat browser tidak dapat memverifikasi URL Brave. Commit/push belum dilakukan.
Demo pesanan/ulasan tetap membaca fixtures secara langsung agar ID contoh lama tidak
dikirim ke API. Checkout/pesanan sudah terintegrasi pada langkah 5, dan Admin pada langkah 6.

## Langkah 2 — Cari yang Cocok (kamu)

File: `modules/catalog/data/products.ts` (`findMatches`), `modules/match/criteria.ts`.

- [x] `POST /api/products/match` body: `category` (wajib), `style`, `size`, `minPrice`,
      `maxPrice`, `measurements: [{label, cm}]` (label penuh: "Lebar dada", "Pinggang", …).
      Field lain → 422. Respons `data: [{product, diffCm}]`, sudah terurut.
- [x] Ubah `criteria.body` (kunci `dada`, `pinggang`, …) ke `measurements` berlabel.
- [x] `matchProducts` di klien boleh dihapus; pertahankan tes `criteria.test.ts` untuk form.
- [ ] Commit: `feat(fe): use API for size matching`

Validasi langkah 2 (16 November 2026): typecheck, 94 tes FE, dan lint FE lulus.
`pnpm lint` tetap gagal hanya pada 7 galat `scripts/voiceover.mjs` di luar tugas.
Pemeriksaan HTTP lokal untuk Jaket dan Celana menemukan produk yang diuji dengan
`diffCm: 0`, hasil tanpa kecocokan berupa array kosong, dan halaman Cari yang Cocok
merespons 200. Uji visual belum selesai karena browser access host tidak tersedia.
Form/URL Indonesia dan demo state dipertahankan; hasil serta urutan berasal dari BE.
Commit/push belum dilakukan.

## Langkah 3 — Wishlist (kamu)

File: `modules/wishlist/useWishlist.ts`, `modules/catalog/useProductActions.ts`,
`modules/wishlist/components/WishlistScreen.tsx`.

- [x] `GET /api/wishlist` (Buyer) → item `{id, productId, product_id, unavailable, createdAt}`;
      `product_id` null + `unavailable: true` untuk produk nonaktif.
- [x] `POST /api/wishlist/:productId` (409 = sudah ada), `DELETE /api/wishlist/:productId`.
- [x] Belum login: tombol hati mengarahkan ke `/masuk?kembali=…` (bukan simpan lokal).
- [x] Hapus penyimpanan `pickathrift.wishlist` di localStorage. Meja Perbandingan **tetap lokal**
      (`pickathrift.compare`), BE tidak menyimpannya.
- [x] Toast galat memakai jalur `fail()` yang sudah ada (state X1.7).
- [ ] Commit: `feat(fe): sync wishlist with API`

Validasi langkah 3 (16 November 2026): typecheck, 110 tes FE, dan lint FE lulus.
`pnpm lint` tetap gagal hanya pada 7 galat `scripts/voiceover.mjs` di luar tugas.
Uji API lokal Buyer Uji: GET, POST 201 (body `{}` wajib), duplikat 409, DELETE 200,
dan GET tanpa token 401. Wishlist sesudah uji sama dengan sebelum uji.
Tes juga mencakup klik ganda, retry, barang nonaktif, logout/pergantian akun saat
request berjalan, serta pengalihan tombol hati ke login. Halaman `/wishlist` merespons
200; uji visual belum selesai karena browser access host tidak tersedia.
Cache wishlist hanya di memori per sesi Buyer, key localStorage lama dibersihkan.
Commit/push belum dilakukan.

## Langkah 4 — Profil dan alamat (kamu)

File: `modules/profile/data/profile.ts`, `modules/profile/components/ProfileScreen.tsx`.

- [x] `GET /api/users/me` dan `PATCH /api/users/me` (hanya `name`, `phone`, `address`).
      `address` = objek lengkap `{recipient, phone, street, city, postalCode}` atau null;
      PATCH mengganti seluruh objek. Nomor 08… 10–13 digit, kode pos 5 digit.
- [x] Setelah ganti nama, perbarui sesi (`useSession().updateName` / `authState`).
- [x] Hapus `pickathrift.profile.<email>` dan `pickathrift.addresses` di localStorage.
- [x] Checkout membaca alamat dari profil API.
- [ ] Commit: `feat(fe): save profile and address through API`

Validasi langkah 4 (16 November 2026): typecheck, 122 tes FE, dan lint FE lulus.
`pnpm lint` tetap gagal hanya pada 7 galat `scripts/voiceover.mjs` di luar tugas.
Uji API lokal Buyer Uji: GET/PATCH 200, penolakan alamat parsial 422, dan pemulihan
nama/nomor akun ke nilai sebelum uji. Alamat akun ini masih null dan tidak diubah.
Tes FE mencakup payload alamat lengkap, pemisahan nama/nomor akun dari penerima,
pembaruan sesi dari respons server, checkout dari alamat API, validasi, kegagalan
jaringan, serta respons terlambat setelah pergantian akun.
Alamat yang belum diisi tidak dikirim dalam PATCH; alamat terisi dikirim lengkap.
Penyimpanan lokal lama dibersihkan ketika profil berhasil dimuat/disimpan.
Uji visual belum selesai karena browser access host tidak tersedia. Commit/push belum dilakukan.

## Langkah 5 — Pesanan Buyer (kamu, paling besar)

File: `modules/checkout/data/checkout.ts`, `modules/orders/data/orders.ts`,
`modules/orders/data/orderStore.ts`, `modules/reviews/data/reviews.ts`, `modules/orders/order.ts`.

- [x] Satu fungsi `fromApiOrder(dto) → Order`: `product_id` → `product`, `address_snapshot` →
      `address`, waktu ISO → angka ms, `cancellation_reason` → `cancellation`, `total_price`
      sudah termasuk ongkir 15.000, `version` disimpan (dipakai Admin), `proof.url` privat.
      Status wire sama dengan FE (`MENUNGGU_PEMBAYARAN`, …).
- [x] Buat pesanan: `POST /api/orders` `{product_id, address?}` → 201; **409
      `STOCK_CONFLICT`** → dialog "Yah, keduluan" yang sudah ada.
- [x] Riwayat: `GET /api/orders/my`. Detail: `GET /api/orders/:id` (403 → X1.3 "Bukan milikmu").
- [x] Batal: `POST /api/orders/:id/cancel` body `{}` (hanya Menunggu pembayaran).
- [x] Unggah bukti: `POST /api/orders/:id/payment-proof` multipart **satu field `file`**
      (JPG/PNG ≤ 2 MiB; BE memeriksa isi gambar). Pertahankan validasi FE + cek decode (QA-001).
      Lihat bukti: `GET /api/orders/:id/payment-proof` via `fetch` + token → `URL.createObjectURL`
      (bukan `<img src>` langsung).
- [x] Terima barang: `POST /api/orders/:id/receive` `{}`.
- [x] Ulasan: `POST /api/orders/:id/review` `{rating, comment}` (10–500 karakter, hanya Selesai,
      409 `REVIEW_EXISTS`); daftar ulasan publik `GET /api/reviews`.
- [x] Hitung mundur 6 jam memakai `expiresAt` dari BE.
- [x] Hapus IndexedDB (`orderStore.ts`) dan event `ORDERS_CHANGED` setelah Admin juga pindah ke API.
- [ ] Commit: `feat(fe): place and track buyer orders through API` (boleh dipecah: checkout,
      riwayat/detail, unggah bukti, ulasan).

Validasi langkah 5 (16 November 2026): typecheck, 141 tes FE, lint FE, dan build produksi lulus.
`pnpm lint` tetap gagal hanya pada 7 galat `scripts/voiceover.mjs` di luar tugas.
73 tes BE pesanan/pembayaran/ulasan lulus memakai MongoDB sementara terisolasi.
Uji HTTP tambahan memakai adapter FE asli dan backend terisolasi juga lulus: checkout,
pembatalan, konflik stok, lanjut bayar melalui ID pesanan, unggah/baca bukti privat,
penolakan akses Buyer lain, persetujuan/kirim Admin, penerimaan, ulasan, dan duplikat ulasan.
Database tim tidak dipakai untuk uji mutasi langkah ini. Uji visual belum selesai karena
browser access host tidak tersedia.

Mapper ada di `modules/orders/data/orderDto.ts`. Total memakai nilai BE tanpa menambah
ongkir lagi. Tautan checkout pesanan nyata membawa `?pesanan=<id>` dan memakai snapshot,
sehingga tetap bisa membayar tanpa membaca ulang produk/alamat profil saat ini.
Setelah hitung mundur habis, status dikonfirmasi ke server; FE tidak membatalkan pesanan
nyata sendiri. Blob URL bukti dibersihkan saat komponen dilepas.
Ulasan publik BE tidak menyertakan produk; ulasan milik Buyer memakai snapshot pesanan sendiri.
IndexedDB/event dipertahankan saat langkah 5, lalu dihapus sesudah integrasi Admin pada langkah 6. Rekening transfer
masih konfigurasi contoh FE yang sudah ada (BE belum menyediakan endpoint rekening toko).
Commit/push belum dilakukan.

## Langkah 6 — Admin (kamu)

File: `modules/admin/data/products.ts`, `modules/admin/data/orders.ts`,
`modules/admin/components/*`.

- [x] Produk: `GET /api/admin/products` (filter `status`, `active`), `GET /api/admin/products/:id`,
      `POST /api/products`, `PATCH /api/products/:id`, nonaktif `DELETE /api/products/:id`
      (409 untuk Dipesan/Terjual). Foto: `POST /api/admin/product-images` multipart field
      `images` (1–4) → array path publik.
- [x] Pesanan: `GET /api/admin/orders?status=&page=&limit=` → `data` + `counts` per status
      (dipakai lencana "Pesanan masuk", ganti `countPendingOrders`).
- [x] Aksi: `POST /api/admin/orders/:id/actions` dengan **`version`** + `type`
      `approve|reupload|reject` (+ `proofId`, `note` untuk reupload/reject) atau `ship`
      (`service`, `number`). 409 `STALE_ORDER` → minta muat ulang.
- [x] Bukti bayar: fetch + token → blob URL.
- [ ] Commit: `feat(fe): manage admin products and orders through API`

Validasi langkah 6 (16 November 2026): typecheck, 157 tes FE, lint FE, dan build produksi lulus.
`pnpm lint` tetap gagal hanya pada 7 galat `scripts/voiceover.mjs` di luar tugas.
123 tes BE produk/pembayaran lulus dengan MongoDB sementara terisolasi.
Uji HTTP tambahan memakai adapter FE Admin dan backend terisolasi juga lulus: unggah
PNG/JPEG, tambah/edit/aktif/nonaktif produk, filter stok, penolakan perubahan stok terkunci,
bukti privat, minta unggah ulang, penggantian bukti, approve/reject/ship, `STALE_ORDER`,
pagination, dan counts global yang tidak terpengaruh filter. Database tim tidak dimutasi.
Uji visual belum selesai karena browser access host tidak tersedia.

Daftar produk membaca seluruh pagination API agar pencarian/filter dan angka status pada
layar tetap lengkap; service juga menerima filter BE `status`/`active`. Daftar pesanan
memakai filter/pagination BE dan URL `?halaman=…`; lencana sidebar memakai `counts` BE.
Foto diunggah sebelum produk disimpan dan form menunggu unggahan selesai.
Keputusan pesanan mengirim versi dan proofId yang dilihat Admin; 409 memblokir keputusan
berikutnya sampai muat ulang, lalu checklist direset untuk pemeriksaan ulang.
IndexedDB pesanan, event stok lokal, dan helper penimpaan stok telah dihapus karena semua
pembacaan/pembaruan Buyer dan Admin kini lewat API. Pembersihan fixtures tersisa di langkah 7.
Commit/push belum dilakukan.

## Langkah 7 — Bersih-bersih dan uji (kamu)

- [x] Hapus fixtures yang tidak dipakai (`catalog/data/fixtures.ts`, `productStore.ts`,
      `orders/data/fixtures.ts`, `checkout/data/fixtures.ts`, `reviews/data/fixtures.ts`, …) —
      syarat rubrik FE5 (data tidak boleh ditulis langsung di kode).
- [x] Hapus `?demo=` yang sudah tidak berarti; pertahankan state yang bisa dipicu dari API asli.
- [x] Perbarui `fe/README.md` (bagian Data dan daftar URL demo).
- [x] Uji manual alur penuh: daftar → login → alamat → checkout → unggah bukti → Admin setujui →
      kirim → Buyer terima → ulasan. Uji pembatalan, kedaluwarsa, dan dua browser berebut
      barang yang sama (satu 201, satu 409).
- [x] Sesudah stabil: 2–3 tes Playwright alur utama (OP-001) dan ukur LCP gambar di build
      production (OP-003).
- [ ] Commit: `feat(fe): remove API demos and verify checkout flows`

Validasi langkah 7 (16 November 2026) mencakup typecheck, 154 tes FE, lint FE, build
produksi, dan 3 tes Playwright yang lulus. `pnpm lint` masih gagal pada 7 galat
`scripts/voiceover.mjs` di luar tugas. Uji langsung di browser mencakup daftar sampai
ulasan publik, pembatalan, kedaluwarsa, dan perebutan stok. Playwright mengonfirmasi
respons HTTP 201 dan 409 `STOCK_CONFLICT` serta pemulihan katalog setelah offline.
Kedua pengujian memakai API nyata dengan replica set MongoDB sementara yang terpisah dari
database tim. Untuk menguji kedaluwarsa, waktu pesanan uji disiapkan melewati tenggat.

LCP gambar di build produksi lokal, median 3 navigasi per ukuran viewport, Chromium
tanpa pembatasan jaringan, profil browser baru per navigasi, dan cache pengoptimal gambar
server sudah dipanaskan.

| Layar | Desktop 1440 × 900 | Mobile 390 × 844 |
| --- | ---: | ---: |
| Beranda (hero) | 160 ms | 160 ms |
| Detail produk (foto dari API) | 184 ms | 160 ms |

Rekening transfer dibaca dari variabel `NEXT_PUBLIC_TRANSFER_*` yang didokumentasikan di
[`fe/README.md`](../fe/README.md). Simulasi rekening hanya digunakan saat tes.

## Sisa dari QA dan desain (tidak memblokir integrasi)

- QA-007: cek manual zoom bawaan browser 200% (Edge, Firefox) — katalog, filter, dialog,
  checkout, beranda, footer.
- OP-003 bagian murah: kecilkan 9 foto lama di `fe/public` (2,4–3,4 MB) ke lebar 1600 px;
  peringatan dev "fill dengan parent sticky" di Hero.
- DS-008: menunggu review PM (desain di Figma, board "7 · DS-008", file `WmyBQwSRCjklLGNjBccgli`).
- Panduan "Cara mengukur" belum punya versi Celana.
- Tray "Bandingkan" menimpa logo footer di dasar katalog — sembunyikan saat footer terlihat.
