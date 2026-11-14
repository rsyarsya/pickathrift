const { before, beforeEach, after, test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const { start } = require("../webthrift");
const User = require("../models/user");
const Product = require("../models/products");
const Order = require("../models/order");
const { productInput } = require("./fixtures");

const secret = randomBytes(48).toString("hex");
const missing = new mongoose.Types.ObjectId().toString();
let mongo, server, base, adminToken, buyerToken;

async function request(route, { method = "GET", token, body } = {}) {
  const response = await fetch(`${base}/api${route}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json();
  assert.equal(json.success, response.ok);
  assert.notEqual(response.status, 500, `${method} ${route}: ${JSON.stringify(json)}`);
  const inspect = (value) => {
    if (!value || typeof value !== "object") return;
    for (const [key, nested] of Object.entries(value)) {
      assert.ok(!["_id", "__v", "password"].includes(key), `Field privat: ${key}`);
      inspect(nested);
    }
  };
  if (json.success) inspect(json.data);
  else {
    assert.equal(typeof json.code, "string");
    assert.equal(typeof json.message, "string");
    assert.equal(json.stack, undefined);
  }
  return { status: response.status, json };
}

async function create(input = productInput()) {
  const result = await request("/products", { method: "POST", token: adminToken, body: input });
  assert.equal(result.status, 201, JSON.stringify(result.json));
  return result.json.data;
}
const patch = (id, body) =>
  request(`/products/${id}`, { method: "PATCH", token: adminToken, body });
const deactivate = (id) => request(`/products/${id}`, { method: "DELETE", token: adminToken });
const catalog = async (query = "", admin = false) => {
  const result = await request(`${admin ? "/admin" : ""}/products${query ? `?${query}` : ""}`, {
    token: admin ? adminToken : undefined,
  });
  assert.equal(result.status, 200, JSON.stringify(result.json));
  return result.json.data;
};

before(async () => {
  mongo = await MongoMemoryReplSet.create({ binary: { version: "8.2.6" }, replSet: { count: 1 } });
  server = await start({
    mongoUri: mongo.getUri("pickathrift_products_test"),
    jwtSecret: secret,
    port: 0,
    nodeEnv: "test",
  });
  base = `http://127.0.0.1:${server.address().port}`;
  const [admin, buyer] = await User.create([
    {
      name: "Admin Produk QA",
      email: "products-admin@example.test",
      password: "fixture-not-used-for-login",
      role: "admin",
    },
    {
      name: "Buyer Produk QA",
      email: "products-buyer@example.test",
      password: "fixture-not-used-for-login",
    },
  ]);
  adminToken = jwt.sign({ id: admin.id }, secret, { expiresIn: "1h" });
  buyerToken = jwt.sign({ id: buyer.id }, secret, { expiresIn: "1h" });
});

beforeEach(async () => {
  await Promise.all([Product.deleteMany({}), Order.deleteMany({})]);
});
after(async () => {
  if (server)
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test("produk lengkap disimpan dan dibaca kembali sesuai bentuk Product FE", async () => {
  const input = productInput({
    name: "  Jaket lengkap  ",
    brand: "  Vintage  ",
    color: "  Olive  ",
    images: ["/images/utama.jpg", "https://example.test/2.jpg", "/images/3.png", "/images/4.jpg"],
    measurements: [
      { label: "Lebar dada", cm: 54.5 },
      { label: "Panjang", cm: 200 },
      { label: "Bahu", cm: 40 },
      { label: "Lengan", cm: 0.5 },
    ],
  });
  const product = await create(input);
  assert.equal(product.name, "Jaket lengkap");
  assert.equal(product.brand, "Vintage");
  assert.equal(product.color, "Olive");
  assert.equal(product.status, "available");
  assert.equal(product.active, true);
  assert.match(product.id, /^[a-f\d]{24}$/);
  assert.ok(Number.isFinite(Date.parse(product.createdAt)));
  assert.ok(Number.isFinite(Date.parse(product.updatedAt)));
  assert.deepEqual(product.images, input.images);
  assert.deepEqual(product.measurements, input.measurements);
  assert.deepEqual((await request(`/products/${product.id}`)).json.data, product);
  const stored = await Product.findById(product.id).lean();
  for (const key of [
    "name",
    "brand",
    "category",
    "size",
    "condition",
    "style",
    "color",
    "price",
    "images",
    "measurements",
    "active",
    "status",
  ]) {
    assert.deepEqual(stored[key], product[key], key);
  }
  const reordered = [...input.images].reverse();
  assert.equal((await patch(product.id, { images: reordered })).status, 200);
  assert.deepEqual((await request(`/products/${product.id}`)).json.data.images, reordered);
  assert.equal((await Product.findById(product.id)).images[0], input.images[3]);
});

test("warna dan ukuran cm opsional; label ukuran sesuai semua kategori FE", async () => {
  const input = productInput();
  delete input.color;
  delete input.measurements;
  const product = await create(input);
  assert.equal(product.color, "");
  assert.deepEqual(product.measurements, []);
  for (const category of ["Jaket", "Kaos", "Kemeja"]) {
    for (const size of ["XS", "S", "M", "L", "XL"]) await create(productInput({ category, size }));
  }
  for (const size of ["27", "28", "29", "30", "31", "32", "33", "34", "36"]) {
    await create(
      productInput({
        category: "Celana",
        size,
        measurements: [
          { label: "Pinggang", cm: 80 },
          { label: "Panjang", cm: 100 },
          { label: "Lebar paha", cm: 30 },
          { label: "Lebar bawah", cm: 20 },
        ],
      }),
    );
  }
});

test("POST menolak field wajib hilang, enum salah, ukuran salah, dan data foto/angka rusak", async (t) => {
  for (const key of [
    "name",
    "brand",
    "category",
    "size",
    "condition",
    "style",
    "price",
    "images",
  ]) {
    await t.test(`wajib ${key}`, async () => {
      const input = productInput();
      delete input[key];
      assert.equal(
        (await request("/products", { method: "POST", token: adminToken, body: input })).status,
        422,
      );
    });
  }
  const invalid = [
    { name: " " },
    { brand: " " },
    { name: "x".repeat(201) },
    { brand: "x".repeat(101) },
    { color: "x".repeat(101) },
    { category: "Sepatu" },
    { condition: "Baru tanpa tag" },
    { style: "Acak" },
    { price: 999 },
    { price: -1 },
    { price: 1000.5 },
    { price: "1000" },
    { price: null },
    { size: "XXL" },
    { size: "31" },
    { category: "Celana", size: "M", measurements: [] },
    { category: "Celana", size: "31", measurements: [{ label: "Lebar dada", cm: 55 }] },
    { images: [] },
    { images: null },
    { images: "https://example.test/a.jpg" },
    { images: Array(5).fill("/images/a.jpg") },
    { images: [""] },
    { images: [{}] },
    ...[
      "data:image/png;base64,abc",
      "blob:http://localhost/x",
      "file:///C:/foto.png",
      "C:\\foto.png",
      "javascript:alert(1)",
      "//example.test/a.png",
      "https://user:password@example.test/a.jpg",
      "/images/../secret",
    ].map((image) => ({ images: [image] })),
    { measurements: [{ label: "Lebar dada", cm: 0 }] },
    { measurements: [{ label: "Lebar dada", cm: 201 }] },
    { measurements: [{ label: "Lebar dada", cm: "54" }] },
    {
      measurements: [
        { label: "Lebar dada", cm: 54 },
        { label: "Lebar dada", cm: 55 },
      ],
    },
    { measurements: [null] },
    { measurements: {} },
    { measurements: [{ label: "Bahu", cm: 40, extra: "ignored?" }] },
    { status: "sold" },
    { active: false },
    { createdAt: "2000-01-01" },
    { id: missing },
    { $set: { price: 1 } },
    { title: "Nama lama" },
  ];
  for (let index = 0; index < invalid.length; index++) {
    await t.test(`input tidak valid ${index + 1}`, async () => {
      const result = await request("/products", {
        method: "POST",
        token: adminToken,
        body: productInput(invalid[index]),
      });
      assert.equal(result.status, 422);
    });
  }
  assert.equal(await Product.countDocuments(), 0);
});

test("PATCH memvalidasi hasil gabungan dan perubahan kategori tidak menyimpan ukuran lama", async () => {
  const product = await create();
  for (const body of [
    { category: "Celana" },
    { category: "Celana", size: "31" },
    { price: 0 },
    { condition: "Acak" },
    { images: [] },
    { measurements: [{ label: "Pinggang", cm: 80 }] },
    { active: "false" },
    { status: "sold" },
    { __v: 999 },
    { $set: { name: "X" } },
  ]) {
    assert.equal((await patch(product.id, body)).status, 422);
    assert.deepEqual((await request(`/products/${product.id}`)).json.data, product);
  }
  const changed = await patch(product.id, {
    category: "Celana",
    size: "31",
    measurements: [
      { label: "Pinggang", cm: 80 },
      { label: "Panjang", cm: 100 },
    ],
  });
  assert.equal(changed.status, 200);
  assert.equal(changed.json.data.category, "Celana");
  assert.equal(changed.json.data.size, "31");
  assert.deepEqual(changed.json.data.measurements, [
    { label: "Pinggang", cm: 80 },
    { label: "Panjang", cm: 100 },
  ]);
  assert.equal(
    (await patch(product.id, { category: "Kaos", size: "S", measurements: [] })).status,
    200,
  );
});

test("produk Dipesan mengunci harga/ukuran tetapi tetap mengizinkan edit informasi lain", async () => {
  const product = await create();
  await Product.updateOne({ _id: product.id }, { status: "reserved" });
  for (const body of [{ price: 80000 }, { size: "L" }, { active: false }]) {
    assert.equal((await patch(product.id, body)).status, 409);
  }
  assert.equal((await deactivate(product.id)).status, 409);
  const changed = await patch(
    product.id,
    productInput({ name: "Nama diperjelas", color: "Hijau" }),
  );
  assert.equal(changed.status, 200);
  assert.equal(changed.json.data.name, "Nama diperjelas");
  assert.equal(changed.json.data.status, "reserved");
  assert.equal(changed.json.data.price, product.price);
  assert.equal(changed.json.data.size, product.size);
  assert.equal(changed.json.data.active, true);
});

test("produk Terjual menolak edit dan penonaktifan", async () => {
  const product = await create();
  await Product.updateOne({ _id: product.id }, { status: "sold" });
  for (const body of [
    { name: "Nama diubah" },
    { price: 90000 },
    { images: ["/foto-baru.jpg"] },
    { active: false },
    { active: true },
  ]) {
    assert.equal((await patch(product.id, body)).status, 409);
  }
  assert.equal((await deactivate(product.id)).status, 409);
  assert.equal((await Product.findById(product.id)).name, product.name);
  assert.equal((await request(`/products/${product.id}`)).json.data.status, "sold");
});

test("nonaktif terpisah dari stok, hanya Admin dapat melihat dan mengaktifkan kembali", async () => {
  const product = await create();
  const removed = await deactivate(product.id);
  assert.equal(removed.status, 200);
  assert.equal(removed.json.data.active, false);
  assert.equal(removed.json.data.status, "available");
  assert.equal(await Product.countDocuments(), 1);
  assert.equal((await catalog()).total, 0);
  assert.equal((await request(`/products/${product.id}`)).status, 404);
  assert.equal((await request(`/products/${product.id}`, { token: adminToken })).status, 404);
  assert.equal((await request("/admin/products")).status, 401);
  for (const route of ["/admin/products", `/admin/products/${product.id}`]) {
    assert.equal((await request(route, { token: buyerToken })).status, 403);
  }
  const admin = (await request(`/admin/products/${product.id}`, { token: adminToken })).json.data;
  assert.equal(admin.active, false);
  assert.equal((await catalog("active=false", true)).total, 1);
  assert.equal((await catalog("active=true", true)).total, 0);
  assert.equal(
    (
      await request("/orders", {
        method: "POST",
        token: buyerToken,
        body: { product_id: product.id },
      })
    ).status,
    404,
  );
  assert.equal(await Order.countDocuments(), 0);
  assert.equal((await patch(product.id, { active: true })).status, 200);
  assert.equal((await catalog()).total, 1);
  assert.equal((await request(`/products/${product.id}`)).status, 200);
});

async function seedCatalog() {
  const entries = [
    { name: "Canvas [jacket]", brand: "Local", price: 80000 },
    {
      name: "Denim jacket",
      brand: "Levi's",
      size: "L",
      price: 100000,
      status: "reserved",
      condition: "Sangat baik",
    },
    { name: "Kaos band", category: "Kaos", size: "S", price: 50000, status: "sold" },
    { name: "Oxford", category: "Kemeja", brand: "Uniqlo", price: 80000 },
    {
      name: "Jeans",
      category: "Celana",
      brand: "Levi's",
      size: "31",
      price: 90000,
      measurements: [{ label: "Pinggang", cm: 80 }],
    },
    { name: "Hidden", size: "XS", price: 1000, active: false },
    { name: "Canvas warm", brand: "Local", price: 80000 },
  ];
  const products = [];
  for (let index = 0; index < entries.length; index++) {
    products.push(
      await Product.create({
        ...productInput(entries[index]),
        createdAt: new Date(`2026-01-0${index + 1}T00:00:00Z`),
      }),
    );
  }
  return products;
}

test("katalog default memuat semua status aktif, pencarian nama/merek dan teks regex literal", async () => {
  await seedCatalog();
  const all = await catalog();
  assert.equal(all.total, 6);
  assert.deepEqual(
    new Set(all.items.map((item) => item.status)),
    new Set(["available", "reserved", "sold"]),
  );
  assert.deepEqual(
    all.items.map((item) => item.name),
    ["Canvas warm", "Jeans", "Oxford", "Kaos band", "Denim jacket", "Canvas [jacket]"],
  );
  assert.equal((await catalog("q=canvas")).total, 2);
  assert.equal((await catalog("q=LEVI%27S")).total, 2);
  assert.equal((await catalog("q=%5Bjacket%5D")).total, 1);
  assert.equal((await catalog("q=.*")).total, 0);
  assert.equal((await catalog("q=hidden")).total, 0);
  assert.equal((await catalog("q=%20")).total, 6);
  assert.equal((await catalog("availableOnly=true")).total, 4);
  assert.equal((await catalog("availableOnly=false")).total, 6);
});

test("katalog tanpa produk memberi counts nol dan halaman kosong untuk publik/Admin", async () => {
  for (const admin of [false, true]) {
    const empty = await catalog("", admin);
    assert.deepEqual(empty, {
      items: [],
      total: 0,
      counts: { Semua: 0, Jaket: 0, Kaos: 0, Kemeja: 0, Celana: 0 },
      page: 1,
      limit: 12,
      totalPages: 0,
    });
  }
});

test("filter match sementara tetap bekerja pada model baru dan menyembunyikan nonaktif", async () => {
  await seedCatalog();
  const result = await request("/products/match", {
    method: "POST",
    body: { clothing_type: "Jaket", style: "Kasual", size: "M", max_budget: 80000 },
  });
  assert.equal(result.status, 200);
  assert.equal(result.json.data.length, 2);
  for (const product of result.json.data) {
    assert.equal(product.category, "Jaket");
    assert.equal(product.active, true);
    assert.equal(product.status, "available");
  }
});

test("kombinasi filter memakai OR dalam field dan AND antar field; counts tidak ikut filter", async () => {
  await seedCatalog();
  const query =
    "category=Jaket&sizes=M,L&conditions=Baik,Sangat%20baik&minPrice=80000&maxPrice=100000";
  assert.equal((await catalog(query)).total, 3);
  const available = await catalog(`${query}&availableOnly=true`);
  assert.equal(available.total, 2);
  assert.deepEqual(available.counts, { Semua: 6, Jaket: 3, Kaos: 1, Kemeja: 1, Celana: 1 });
  assert.equal((await catalog("sizes=S&sizes=31")).total, 2);
  assert.equal((await catalog("conditions=Baik&conditions=Sangat%20baik")).total, 6);
  assert.equal((await catalog("minPrice=80000&maxPrice=80000")).total, 3);
  assert.equal((await catalog("category=Celana&sizes=31")).total, 1);
  const empty = await catalog("category=Kaos&sizes=XL");
  assert.equal(empty.total, 0);
  assert.equal(empty.totalPages, 0);
  assert.deepEqual(empty.items, []);
  assert.equal(empty.counts.Semua, 6);
});

test("urutan harga, pagination, total, halaman kosong, serta tie-breaker stabil", async () => {
  await seedCatalog();
  const ascending = await catalog("sort=termurah");
  assert.deepEqual(
    ascending.items.map((item) => item.price),
    [50000, 80000, 80000, 80000, 90000, 100000],
  );
  assert.deepEqual(
    ascending.items.slice(1, 4).map((item) => item.name),
    ["Canvas warm", "Oxford", "Canvas [jacket]"],
  );
  assert.deepEqual(
    (await catalog("sort=termahal")).items.map((item) => item.price),
    [100000, 90000, 80000, 80000, 80000, 50000],
  );
  const seen = [];
  for (let page = 1; page <= 3; page++) {
    const result = await catalog(`limit=2&page=${page}`);
    assert.equal(result.page, page);
    assert.equal(result.limit, 2);
    assert.equal(result.total, 6);
    assert.equal(result.totalPages, 3);
    seen.push(...result.items.map((item) => item.id));
  }
  assert.equal(new Set(seen).size, 6);
  assert.deepEqual(
    seen,
    (await catalog()).items.map((item) => item.id),
  );
  const outside = await catalog("limit=2&page=4");
  assert.deepEqual(outside.items, []);
  assert.equal(outside.total, 6);
  assert.deepEqual((await catalog("limit=2")).items, (await catalog("limit=2")).items);
  assert.equal((await catalog()).limit, 12);
  // Tanggal sama tetap punya urutan ID yang konsisten antar halaman.
  await Product.collection.updateMany({}, { $set: { createdAt: new Date("2026-01-01") } });
  assert.equal((await Product.distinct("createdAt")).length, 1);
  const ties = await catalog();
  const ids = ties.items.map((item) => item.id);
  assert.deepEqual(ids, [...ids].sort().reverse());
});

test("daftar Admin memuat nonaktif dan dapat difilter status tanpa membuka akses publik", async () => {
  await seedCatalog();
  const all = await catalog("", true);
  assert.equal(all.total, 7);
  assert.equal(all.counts.Semua, 7);
  assert.equal((await catalog("status=reserved", true)).total, 1);
  assert.equal((await catalog("status=sold", true)).total, 1);
  assert.equal((await catalog("status=available&active=false", true)).total, 1);
  const empty = await catalog("status=sold&category=Jaket", true);
  assert.equal(empty.total, 0);
  assert.equal(empty.counts.Jaket, 4);
});

test("urutan terbaru Admin memakai waktu edit; katalog tetap memakai waktu penambahan", async () => {
  const products = await seedCatalog();
  const oldest = products[0];
  assert.equal((await patch(oldest.id, { name: "Nama diperjelas setelah review" })).status, 200);
  assert.equal((await catalog("", true)).items[0].id, oldest.id);
  assert.equal((await catalog()).items.at(-1).id, oldest.id);
});

test("query invalid/duplikat/asing ditolak 422, bukan diam-diam diabaikan", async (t) => {
  for (const query of [
    "category=Sepatu",
    "category=Jaket&category=Kaos",
    "q=x&q=y",
    "sort=x",
    "sizes=XXL",
    "sizes=M,",
    "conditions=Acak",
    "minPrice=-1",
    "minPrice=NaN",
    "minPrice=Infinity",
    "minPrice=0xFF",
    "minPrice=2&maxPrice=1",
    "maxPrice=",
    "availableOnly=1",
    "availableOnly=true&availableOnly=false",
    "page=0",
    "page=-1",
    "page=1.5",
    "limit=0",
    "limit=101",
    "limit=abc",
    "page=9007199254740991&limit=100",
    "q[$ne]=x",
    "sizes[$in]=M",
    "search=x",
    "min_price=1",
    "status=available",
    "active=false",
  ]) {
    await t.test(query, async () => {
      assert.equal((await request(`/products?${query}`)).status, 422);
    });
  }
  assert.equal((await request("/admin/products?active=no", { token: adminToken })).status, 422);
  assert.equal(
    (await request("/admin/products?availableOnly=true&status=sold", { token: adminToken })).status,
    422,
  );
});

test("ID rusak/tidak ditemukan ditangani pada route produk publik dan Admin", async () => {
  for (const route of ["/products/", "/admin/products/"]) {
    assert.equal((await request(`${route}bad`, { token: adminToken })).status, 422);
    assert.equal((await request(`${route}${missing}`, { token: adminToken })).status, 404);
  }
  assert.equal((await patch(missing, { name: "Valid" })).status, 404);
  assert.equal((await deactivate(missing)).status, 404);
});

test("riwayat order baru menyimpan salinan produk yang tidak berubah oleh edit/nonaktif/hapus", async () => {
  const product = await create();
  const placed = await request("/orders", {
    method: "POST",
    token: buyerToken,
    body: { product_id: product.id },
  });
  assert.equal(placed.status, 201);
  const snapshot = placed.json.data.product_id;
  assert.equal(snapshot.id, product.id);
  assert.equal(snapshot.name, product.name);
  assert.ok((await Order.findById(placed.json.data.id)).product_snapshot);
  assert.equal(
    (await patch(product.id, { name: "Nama baru", images: ["/foto-baru.jpg"] })).status,
    200,
  );
  const readOrder = async () =>
    (await request(`/orders/${placed.json.data.id}`, { token: buyerToken })).json.data;
  assert.deepEqual((await readOrder()).product_id, snapshot);
  // Simulasikan stok dilepas setelah pembatalan; alur pembatalan masuk batch 4.
  await Product.updateOne({ _id: product.id }, { status: "available" });
  await Order.updateOne({ _id: placed.json.data.id }, { status: "cancelled" });
  assert.equal((await deactivate(product.id)).status, 200);
  assert.equal((await request(`/products/${product.id}`)).status, 404);
  assert.deepEqual((await readOrder()).product_id, snapshot);
  await Product.deleteOne({ _id: product.id }); // Ketahanan referensi riwayat, bukan fitur hard-delete.
  assert.deepEqual((await readOrder()).product_id, snapshot);
});

test("edit harga yang berbarengan dengan pemesanan tidak mengubah harga barang yang sudah terkunci", async () => {
  for (let index = 0; index < 5; index++) {
    const product = await create();
    const [edit, placed] = await Promise.all([
      patch(product.id, { price: 90000 }),
      request("/orders", { method: "POST", token: buyerToken, body: { product_id: product.id } }),
    ]);
    assert.equal(placed.status, 201);
    assert.ok([200, 409].includes(edit.status));
    const stored = await Product.findById(product.id);
    assert.equal(stored.status, "reserved");
    assert.equal(stored.price, placed.json.data.total_price);
    assert.equal(stored.price, placed.json.data.product_id.price);
  }
});

test("penonaktifan dan pemesanan bersamaan tidak menghasilkan order untuk barang nonaktif", async () => {
  for (let index = 0; index < 5; index++) {
    const product = await create();
    const [removed, placed] = await Promise.all([
      deactivate(product.id),
      request("/orders", { method: "POST", token: buyerToken, body: { product_id: product.id } }),
    ]);
    const stored = await Product.findById(product.id);
    if (placed.status === 201) {
      assert.equal(removed.status, 409);
      assert.equal(stored.active, true);
      assert.equal(stored.status, "reserved");
      assert.equal(await Order.countDocuments({ product_id: product.id }), 1);
    } else {
      assert.equal(placed.status, 404);
      assert.equal(removed.status, 200);
      assert.equal(stored.active, false);
      assert.equal(stored.status, "available");
      assert.equal(await Order.countDocuments({ product_id: product.id }), 0);
    }
  }
});
