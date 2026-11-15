const { before, after, test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const path = require("node:path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const { start } = require("../webthrift");
const { getConfig } = require("../config");
const User = require("../models/user");
const Order = require("../models/order");
const Product = require("../models/products");
const Review = require("../models/review");
const Wishlist = require("../models/wishlist");
const { productInput } = require("./fixtures");
const serialize = require("../lib/serializers");

const secret = randomBytes(48).toString("hex");
const credentials = { email: "buyer@example.test", password: "Buyer123!" };
const missing = new mongoose.Types.ObjectId().toString();
let mongo, server, base, buyer, other, admin, buyerToken, otherToken, adminToken, order, product;

async function request(route, { method = "GET", token, body, raw, headers = {} } = {}) {
  const response = await fetch(`${base}/api${route}`, {
    method,
    headers: {
      ...(body !== undefined || raw !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const json = await response.json();
  assert.equal(json.success, response.ok);
  if (!response.ok) {
    assert.equal(typeof json.code, "string");
    assert.equal(typeof json.message, "string");
    assert.ok(!JSON.stringify(json).includes("stack"));
  }
  return { status: response.status, json };
}

function noPrivateFields(value) {
  if (value === null || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    assert.ok(!["password", "__v", "_id"].includes(key), `Field privat bocor: ${key}`);
    noPrivateFields(nested);
  }
}

async function login(email, password, role) {
  const result = await request("/auth/login", { method: "POST", body: { email, password, role } });
  assert.equal(result.status, 200);
  noPrivateFields(result.json);
  return result.json.data.token;
}

before(async () => {
  mongo = await MongoMemoryReplSet.create({ binary: { version: "8.2.6" }, replSet: { count: 1 } });
  server = await start({
    mongoUri: mongo.getUri("pickathrift_access_test"),
    jwtSecret: secret,
    port: 0,
    nodeEnv: "test",
  });
  base = `http://127.0.0.1:${server.address().port}`;
  const hash = await bcrypt.hash(credentials.password, 10);
  [buyer, other, admin] = await User.create([
    { ...credentials, password: hash, name: "Buyer QA" },
    { email: "other@example.test", password: hash, name: "Buyer Lain" },
    { email: "admin@example.test", password: hash, name: "Admin QA", role: "admin" },
  ]);
  buyerToken = await login(credentials.email, credentials.password, "buyer");
  otherToken = await login(other.email, credentials.password, "buyer");
  adminToken = await login(admin.email, credentials.password, "admin");
  product = await Product.create(productInput({ name: "Jaket QA" }));
  order = await Order.create({
    buyer_id: buyer.id,
    product_id: product.id,
    product_snapshot: serialize.product(product),
    total_price: product.price,
  });
});

after(async () => {
  if (server)
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test("registrasi menormalisasi email dan mengabaikan eskalasi peran", async () => {
  const result = await request("/auth/register", {
    method: "POST",
    body: {
      name: "  Buyer Baru  ",
      email: "  BARU@EXAMPLE.TEST ",
      password: "Password123!",
      confirmPassword: "Password123!",
      role: "admin",
      _id: admin.id,
    },
  });
  assert.equal(result.status, 201);
  assert.equal(result.json.data.name, "Buyer Baru");
  assert.equal(result.json.data.email, "baru@example.test");
  assert.equal(result.json.data.role, "buyer");
  assert.notEqual(result.json.data.id, admin.id);
  noPrivateFields(result.json);
  const stored = await User.findById(result.json.data.id).select("+password");
  assert.equal(stored.role, "buyer");
  assert.notEqual(stored.password, "Password123!");
  const token = await login(" BARU@EXAMPLE.TEST ", "Password123!", "buyer");
  assert.equal((await request("/admin/orders", { token })).status, 403);
});

test("dua registrasi email sama menghasilkan satu akun dan satu konflik", async () => {
  const results = await Promise.all(
    ["RACE@example.test", " race@EXAMPLE.TEST "].map((email) =>
      request("/auth/register", {
        method: "POST",
        body: { name: "Race", email, password: "Password123!" },
      }),
    ),
  );
  assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
  assert.equal(results.find((result) => result.status === 409).json.code, "EMAIL_EXISTS");
  assert.equal(await User.countDocuments({ email: "race@example.test" }), 1);
});

test("registrasi menolak input kosong, tipe keliru, operator, dan sandi terlalu panjang", async (t) => {
  const valid = { name: "Valid", email: "valid@example.test", password: "Password123!" };
  for (const body of [
    {},
    [],
    { ...valid, name: " " },
    { ...valid, email: "x@y" },
    { ...valid, email: { $ne: null } },
    { ...valid, password: "1234567" },
    { ...valid, password: "é".repeat(37) },
    { ...valid, password: 12345678 },
    { ...valid, confirmPassword: "berbeda" },
    { ...valid, phone: {} },
    { ...valid, address: [] },
  ]) {
    await t.test(JSON.stringify(body), async () => {
      assert.equal((await request("/auth/register", { method: "POST", body })).status, 422);
    });
  }
});

test("login gagal 401, salah peran 403, input salah 422", async () => {
  const post = (body) => request("/auth/login", { method: "POST", body });
  const wrong = await post({ ...credentials, password: "salah" });
  const absent = await post({ email: "absent@example.test", password: "salah" });
  assert.equal(wrong.status, 401);
  assert.deepEqual(wrong.json, absent.json);
  assert.equal((await post({ ...credentials, role: "admin" })).status, 403);
  assert.equal(
    (await post({ email: admin.email, password: credentials.password, role: "buyer" })).status,
    403,
  );
  for (const body of [
    {},
    { ...credentials, email: { $ne: null } },
    { ...credentials, password: {} },
    { ...credentials, role: "owner" },
  ])
    assert.equal((await post(body)).status, 422);
});

test("token login berlaku sesuai peran dan tidak memuat sandi", () => {
  for (const [token, lifetime] of [
    [buyerToken, 86400],
    [adminToken, 7200],
  ]) {
    const payload = jwt.verify(token, secret);
    assert.equal(payload.exp - payload.iat, lifetime);
    assert.equal(payload.password, undefined);
  }
});

test("token hilang, rusak, salah secret/algoritme, kedaluwarsa, dan akun hilang ditolak 401", async () => {
  const signed = (payload, options = {}) => jwt.sign(payload, secret, options);
  const tokens = [
    undefined,
    "invalid",
    jwt.sign({ id: buyer.id }, "other-secret"),
    signed({ id: buyer.id }, { expiresIn: -1 }),
    signed({ id: buyer.id }, { algorithm: "HS384" }),
    signed({ id: "bad-id" }),
    signed({ id: missing }),
  ];
  for (const token of tokens) assert.equal((await request("/users/me", { token })).status, 401);
  for (const header of ["Basic abc", `Bearer ${buyerToken} extra`]) {
    assert.equal((await request("/users/me", { headers: { Authorization: header } })).status, 401);
  }
});

test("peran database mengalahkan klaim token yang sudah usang", async () => {
  const forgedRole = jwt.sign({ id: buyer.id, role: "admin" }, secret);
  assert.equal((await request("/admin/orders", { token: forgedRole })).status, 403);
  const temporary = await User.create({
    name: "Temp",
    email: "temp@example.test",
    password: "not-a-real-hash",
    role: "admin",
  });
  const token = jwt.sign({ id: temporary.id, role: "admin" }, secret);
  await User.updateOne({ _id: temporary.id }, { role: "buyer" });
  assert.equal((await request("/admin/orders", { token })).status, 403);
  await User.deleteOne({ _id: temporary.id });
  assert.equal((await request("/users/me", { token })).status, 401);
});

test("profil hanya membaca/mengubah akun sendiri dan menolak role/operator", async () => {
  const update = await request("/users/me", {
    method: "PATCH",
    token: buyerToken,
    body: { name: "Buyer Diperbarui", phone: "08123456789" },
  });
  assert.equal(update.status, 200);
  assert.equal(update.json.data.name, "Buyer Diperbarui");
  noPrivateFields(update.json);
  assert.equal(
    (await request("/users/me", { token: buyerToken })).json.data.name,
    "Buyer Diperbarui",
  );
  assert.equal((await request("/users/me", { token: otherToken })).json.data.name, "Buyer Lain");
  for (const body of [
    { role: "admin" },
    { _id: other.id },
    { $set: { role: "admin" } },
    { email: "new@example.test" },
    { name: " " },
    { address: {} },
    {},
  ]) {
    assert.equal(
      (await request("/users/me", { method: "PATCH", token: buyerToken, body })).status,
      422,
    );
  }
  assert.equal((await User.findById(buyer.id)).role, "buyer");
});

test("pesanan hanya dibaca pemilik atau Admin; daftar Buyer terpisah", async () => {
  for (const token of [buyerToken, adminToken]) {
    const result = await request(`/orders/${order.id}`, { token });
    assert.equal(result.status, 200);
    noPrivateFields(result.json);
  }
  assert.equal((await request(`/orders/${order.id}`, { token: otherToken })).status, 403);
  assert.equal((await request("/orders/my", { token: buyerToken })).json.data.length, 1);
  assert.equal((await request("/orders/my", { token: otherToken })).json.data.length, 0);
  assert.equal((await request("/admin/orders", { token: adminToken })).status, 200);
  assert.equal((await request("/admin/orders", { token: buyerToken })).status, 403);
});

test("Admin tidak dapat menggunakan operasi khusus Buyer", async () => {
  for (const [route, method, body] of [
    ["/orders", "POST", { product_id: product.id }],
    ["/orders/my", "GET"],
    ["/wishlist", "GET"],
    [`/wishlist/${product.id}`, "POST", {}],
    [`/wishlist/${product.id}`, "DELETE"],
    [`/orders/${order.id}/review`, "POST", { rating: 5, comment: "Bagus" }],
  ]) {
    assert.equal((await request(route, { token: adminToken, method, body })).status, 403);
  }
});

test("wishlist Buyer terpisah dan penghapusan tidak dapat menyentuh akun lain", async () => {
  const added = await request(`/wishlist/${product.id}`, {
    method: "POST",
    token: buyerToken,
    body: {},
  });
  assert.equal(added.status, 201);
  assert.equal((await request("/wishlist", { token: otherToken })).json.data.length, 0);
  assert.equal(
    (await request(`/wishlist/${product.id}`, { method: "DELETE", token: otherToken })).status,
    404,
  );
  assert.equal(await Wishlist.countDocuments({ user_id: buyer.id, product_id: product.id }), 1);
  const own = await request("/wishlist", { token: buyerToken });
  assert.equal(own.json.data.length, 1);
  noPrivateFields(own.json);
});

test("ulasan harus milik Buyer dan GET ulasan publik tidak lagi tertutup router", async () => {
  const body = { rating: 5, comment: "Barang sesuai keterangan." };
  assert.equal(
    (await request(`/orders/${order.id}/review`, { method: "POST", token: otherToken, body }))
      .status,
    403,
  );
  // Seed langsung: aturan status Selesai/duplikat belum masuk batch ini.
  await Review.create({ order_id: order.id, buyer_id: buyer.id, ...body });
  const result = await request("/reviews");
  assert.equal(result.status, 200);
  assert.equal(result.json.data[0].rating, 5);
  noPrivateFields(result.json);
  assert.ok(!JSON.stringify(result.json).includes(buyer.email));
  assert.equal(result.json.data[0].buyer_id, undefined);
});

test("ID rusak 422 dan ID yang tidak ada 404 pada endpoint domain", async () => {
  const cases = [
    ["GET", "/products/", undefined],
    ["PATCH", "/products/", adminToken, { price: 5000 }],
    ["DELETE", "/products/", adminToken],
    ["GET", "/orders/", buyerToken],
    ["PATCH", "/admin/orders/", adminToken, { status: "paid" }, "/status"],
    ["DELETE", "/wishlist/", buyerToken],
    ["POST", "/orders/", buyerToken, { rating: 5, comment: "Review valid" }, "/review"],
  ];
  for (const [method, prefix, token, body, suffix = ""] of cases) {
    for (const [id, status] of [
      ["invalid-id", 422],
      [missing, 404],
    ]) {
      assert.equal(
        (await request(`${prefix}${id}${suffix}`, { method, token, body })).status,
        status,
        `${method} ${prefix}${id}${suffix}`,
      );
    }
  }
});

test("input domain yang tidak valid menghasilkan 422 tanpa mutasi", async () => {
  const cases = [
    ["POST", "/orders", buyerToken, { product_id: { $ne: null } }],
    ["POST", "/products", adminToken, { title: "X" }],
    ["POST", "/products", adminToken, { title: "X", price: -1, category: "Jaket" }],
    ["PATCH", `/products/${product.id}`, adminToken, { status: "banana" }],
    ["PATCH", `/products/${product.id}`, adminToken, { $set: { price: 1 } }],
    ["POST", "/products/match", undefined, { style: { $ne: null } }],
    ["POST", "/products/match", undefined, { max_budget: "abc" }],
    ["PATCH", `/admin/orders/${order.id}/status`, adminToken, { status: "banana" }],
    ["POST", `/orders/${order.id}/review`, buyerToken, { rating: 1.5, comment: "X" }],
    ["POST", `/orders/${order.id}/review`, buyerToken, { rating: 5, comment: {} }],
  ];
  for (const [method, route, token, body] of cases) {
    assert.equal((await request(route, { method, token, body })).status, 422, `${method} ${route}`);
  }
  assert.equal((await Product.findById(product.id)).status, "available");
  assert.equal((await Order.findById(order.id)).status, "pending");
});

test("query numerik/objek tidak valid ditolak dan pencarian regex menjadi teks literal", async () => {
  for (const query of [
    "minPrice=abc",
    "minPrice=-1",
    "maxPrice=Infinity",
    "minPrice=20&maxPrice=10",
    "category=x&category=y",
    "status=banana",
    "sort[$ne]=x",
  ]) {
    assert.equal((await request(`/products?${query}`)).status, 422, query);
  }
  const result = await request("/products?q=%5B");
  assert.equal(result.status, 200);
  assert.equal(result.json.data.total, 0);
});

test("JSON rusak, body besar, route asing, dan alias router lama ditangani konsisten", async () => {
  assert.equal((await request("/auth/login", { method: "POST", raw: "{" })).status, 422);
  assert.equal(
    (await request("/auth/login", { method: "POST", body: { text: "x".repeat(110000) } })).status,
    413,
  );
  assert.equal((await request("/unknown")).status, 404);
  assert.equal((await request("/products/%ZZ")).status, 422);
  assert.equal((await request(`/${order.id}`, { token: buyerToken })).status, 404);
  assert.equal((await request("/orders/admin/orders", { token: adminToken })).status, 404);
});

test("galat database tidak membocorkan detail internal", async () => {
  // Rusakkan fixture melalui DB langsung untuk memicu galat yang bukan input pengguna.
  const corrupt = await User.collection.insertOne({
    name: "Corrupt",
    email: "corrupt@example.test",
    password: {},
  });
  const result = await request("/auth/login", {
    method: "POST",
    body: { email: "corrupt@example.test", password: "Password123!" },
  });
  assert.equal(result.status, 500);
  assert.deepEqual(result.json, {
    success: false,
    code: "INTERNAL_ERROR",
    message: "Terjadi kesalahan pada server.",
  });
  await User.deleteOne({ _id: corrupt.insertedId });
});

test("encoding dan charset tidak didukung menghasilkan 415 dengan respons aman", async () => {
  for (const headers of [
    { "Content-Encoding": "invalid" },
    { "Content-Type": "application/json; charset=invalid" },
  ]) {
    const result = await request("/auth/login", { method: "POST", body: credentials, headers });
    assert.equal(result.status, 415);
    assert.deepEqual(result.json, {
      success: false,
      code: "UNSUPPORTED_MEDIA_TYPE",
      message: "Encoding atau charset request tidak didukung.",
    });
  }
});

test("route produk tetap berjalan untuk Admin dan menolak modifikasi oleh Buyer", async () => {
  for (const [method, route, body] of [
    ["POST", "/products", { title: "X", category: "Jaket", price: 10000 }],
    ["PATCH", `/products/${product.id}`, { price: 10000 }],
    ["DELETE", `/products/${product.id}`],
  ]) {
    assert.equal((await request(route, { token: buyerToken, method, body })).status, 403);
  }
  const added = await request("/products", {
    token: adminToken,
    method: "POST",
    body: productInput({ name: "Produk Admin", price: 25000 }),
  });
  assert.equal(added.status, 201);
  noPrivateFields(added.json);
  const route = `/products/${added.json.data.id}`;
  const edited = await request(route, {
    token: adminToken,
    method: "PATCH",
    body: { price: 35000 },
  });
  assert.equal(edited.status, 200);
  assert.equal(edited.json.data.price, 35000);
  assert.equal((await request(route)).json.data.price, 35000);
  const removed = await request(route, { token: adminToken, method: "DELETE" });
  assert.equal(removed.status, 200);
  assert.equal(removed.json.data.status, "available");
  assert.equal(removed.json.data.active, false);
});

test("Buyer masih bisa membuat pesanan, mengulas pesanan sendiri, dan menghapus wishlist sendiri", async () => {
  const item = await Product.create(
    productInput({ name: "Produk Pesanan QA", price: 50000, category: "Kaos" }),
  );
  const body = { product_id: item.id };
  const placed = await request("/orders", { token: buyerToken, method: "POST", body });
  assert.equal(placed.status, 201);
  assert.equal(placed.json.data.buyer_id, buyer.id);
  noPrivateFields(placed.json);
  assert.equal((await request("/orders", { token: otherToken, method: "POST", body })).status, 409);
  assert.equal(await Order.countDocuments({ product_id: item.id }), 1);
  // Fixture status selesai; transisi pembayaran/pengiriman berada pada batch berikutnya.
  await Order.findByIdAndUpdate(placed.json.data.id, { status: "completed" });
  const reviewed = await request(`/orders/${placed.json.data.id}/review`, {
    token: buyerToken,
    method: "POST",
    body: { rating: 5, comment: "Produk sesuai deskripsi." },
  });
  assert.equal(reviewed.status, 201);
  noPrivateFields(reviewed.json);
  assert.equal(
    (await request(`/wishlist/${product.id}`, { token: buyerToken, method: "DELETE" })).status,
    200,
  );
  assert.equal(await Wishlist.countDocuments({ user_id: buyer.id, product_id: product.id }), 0);
});

test("perintah lokal membuat Admin dan menolak email existing tanpa promosi", async () => {
  const run = promisify(execFile);
  const options = {
    env: {
      ...process.env,
      MONGODB_URI: mongo.getUri("pickathrift_access_test"),
      NODE_ENV: "test",
      ADMIN_NAME: "Admin Lokal",
      ADMIN_EMAIL: " CLI@EXAMPLE.TEST ",
      ADMIN_PASSWORD: "LocalAdmin123!",
    },
    timeout: 15000,
  };
  const script = path.join(__dirname, "../scripts/create-admin.js");
  const result = await run(process.execPath, [script], options);
  assert.match(result.stdout, /Akun Admin berhasil dibuat/);
  assert.ok(!result.stdout.includes(options.env.ADMIN_PASSWORD));
  const account = await User.findOne({ email: "cli@example.test" }).select("+password");
  assert.equal(account.role, "admin");
  assert.ok(await bcrypt.compare(options.env.ADMIN_PASSWORD, account.password));
  await login("cli@example.test", options.env.ADMIN_PASSWORD, "admin");
  options.env.ADMIN_EMAIL = buyer.email;
  await assert.rejects(run(process.execPath, [script], options), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /akun lama tidak diubah/);
    return true;
  });
  assert.equal((await User.findById(buyer.id)).role, "buyer");
});

test("konfigurasi wajib dan database gagal menghentikan startup sebelum listen", async () => {
  assert.throws(() => getConfig({}), /MONGODB_URI/);
  assert.throws(() => getConfig({ MONGODB_URI: "mongodb://unused" }), /JWT_SECRET/);
  assert.throws(
    () => getConfig({ MONGODB_URI: "mongodb://unused", JWT_SECRET: secret, PORT: "nope" }),
    /PORT/,
  );
  const run = promisify(execFile);
  for (const env of [
    { MONGODB_URI: "", JWT_SECRET: "" },
    {
      MONGODB_URI: "mongodb://127.0.0.1:1/does_not_exist?directConnection=true",
      JWT_SECRET: secret,
    },
  ]) {
    await assert.rejects(
      run(process.execPath, [path.join(__dirname, "../webthrift.js")], {
        env: { ...process.env, ...env, NODE_ENV: "test", PORT: "0" },
        timeout: 15000,
      }),
      (error) => {
        assert.equal(error.code, 1);
        assert.equal(error.stdout, "");
        assert.match(error.stderr, /Backend gagal dimulai/);
        assert.ok(!error.stderr.includes(secret));
        return true;
      },
    );
  }
});
