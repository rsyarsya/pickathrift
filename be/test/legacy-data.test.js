const { before, beforeEach, after, afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const { promisify } = require("node:util");
const { execFile } = require("node:child_process");
const path = require("node:path");
const { randomBytes } = require("node:crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const { inspectLegacyData, assertDataReady, migrateLegacyData } = require("../lib/legacy-data");
const { start } = require("../webthrift");
const User = require("../models/user");
const Product = require("../models/products");
const { productInput } = require("./fixtures");

let mongo, hash, uri, server;
const secret = randomBytes(48).toString("hex");
const run = promisify(execFile);
const db = () => mongoose.connection.db;

before(async () => {
  mongo = await MongoMemoryReplSet.create({ binary: { version: "8.2.6" }, replSet: { count: 1 } });
  uri = mongo.getUri("pickathrift_legacy_test");
  await mongoose.connect(uri);
  await User.init();
  hash = await bcrypt.hash("Fictional123!", 10);
});
beforeEach(async () => {
  for (const name of ["users", "products", "orders"]) await db().collection(name).deleteMany({});
});
afterEach(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    server = undefined;
  }
});
after(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

async function seed(overrides = {}) {
  const user = {
    _id: new mongoose.Types.ObjectId(),
    name: "Buyer Lama",
    email: " LEGACY@EXAMPLE.TEST ",
    password: hash,
    role: "buyer",
    phone: "",
    address: "",
    __v: 0,
  };
  const product = {
    _id: new mongoose.Types.ObjectId(),
    title: "Jaket Lama",
    category: "Jaket",
    clothing_type: "Jaket",
    price: 75000,
    brand: "Vintage",
    style: "Kasual",
    size: "M",
    condition: "Baik",
    status: "available",
    image_url: "/images/legacy.jpg",
    createdAt: new Date("2026-10-01"),
    updatedAt: new Date("2026-10-02"),
    __v: 0,
    ...overrides,
  };
  const order = {
    _id: new mongoose.Types.ObjectId(),
    buyer_id: user._id,
    product_id: product._id,
    total_price: 50000,
    status: "pending",
    tracking_number: "",
    createdAt: new Date("2026-10-01"),
    updatedAt: new Date("2026-10-01"),
  };
  await db().collection("users").insertOne(user);
  await db().collection("products").insertOne(product);
  await db().collection("orders").insertOne(order);
  return { user, product, order };
}

const dump = async () => {
  const result = {};
  for (const name of ["users", "products", "orders"])
    result[name] = await db().collection(name).find({}).toArray();
  return result;
};
const config = () => ({ mongoUri: uri, jwtSecret: secret, port: 0, nodeEnv: "test" });
async function request(route, { method = "GET", body, token } = {}) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api${route}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, json: await response.json() };
}

test("dry-run tidak menulis data dan ringkasan tidak membocorkan email/sandi", async () => {
  await seed();
  const before = await dump();
  const plan = await migrateLegacyData(mongoose.connection);
  assert.deepEqual(plan.summary, { users: 1, products: 1, orders: 1, blockers: 0 });
  assert.deepEqual(await dump(), before);
  const report = JSON.stringify({ summary: plan.summary, issues: plan.issues });
  assert.ok(!report.includes(hash));
  assert.ok(!report.includes("EXAMPLE.TEST"));
  await assert.rejects(assertDataReady(mongoose.connection), { code: "DATA_MIGRATION_REQUIRED" });
});

test("migrasi mempertahankan identitas, kredensial, timestamp, dan harga order; API kembali dapat dipakai", async () => {
  const legacy = await seed();
  await migrateLegacyData(mongoose.connection, true);
  await assertDataReady(mongoose.connection);
  const stored = await dump();
  assert.deepEqual(stored.users[0]._id, legacy.user._id);
  assert.equal(stored.users[0].password, hash);
  assert.equal(stored.users[0].role, "buyer");
  assert.equal(stored.users[0].email, "legacy@example.test");
  assert.deepEqual(stored.products[0]._id, legacy.product._id);
  assert.equal(stored.products[0].name, legacy.product.title);
  assert.deepEqual(stored.products[0].images, [legacy.product.image_url]);
  assert.deepEqual(stored.products[0].createdAt, legacy.product.createdAt);
  assert.deepEqual(stored.products[0].updatedAt, legacy.product.updatedAt);
  assert.equal(stored.products[0].title, legacy.product.title); // Field lama tidak dihapus.
  assert.equal(stored.products[0].active, true);
  assert.equal(stored.orders[0].product_snapshot.price, legacy.order.total_price);
  assert.equal(stored.orders[0].product_snapshot_source, "legacy-current-product");
  assert.deepEqual(stored.orders[0].product_id, legacy.product._id);
  const next = await migrateLegacyData(mongoose.connection, true);
  assert.deepEqual(next.summary, { users: 0, products: 0, orders: 0, blockers: 0 });
  server = await start(config());
  const login = await request("/auth/login", {
    method: "POST",
    body: { email: " LEGACY@EXAMPLE.TEST ", password: "Fictional123!" },
  });
  assert.equal(login.status, 200);
  assert.equal(
    (
      await request("/auth/register", {
        method: "POST",
        body: { name: "Duplikat", email: "Legacy@example.test", password: "Fictional123!" },
      })
    ).status,
    409,
  );
  assert.equal((await request("/products")).json.data.total, 1);
  assert.equal(
    (await request(`/products/${legacy.product._id}`)).json.data.name,
    legacy.product.title,
  );
  const admin = await User.create({
    name: "Admin Migrasi",
    email: "admin@example.test",
    password: hash,
    role: "admin",
  });
  const token = jwt.sign({ id: admin.id }, secret);
  assert.equal(
    (
      await request(`/products/${legacy.product._id}`, {
        method: "PATCH",
        token,
        body: productInput(),
      })
    ).status,
    200,
  );
  assert.equal(
    (await request(`/products/${legacy.product._id}`, { method: "DELETE", token })).status,
    200,
  );
  const order = (await request(`/orders/${legacy.order._id}`, { token: login.json.data.token }))
    .json.data;
  assert.equal(order.product_id.name, legacy.product.title);
  assert.equal(order.product_id.price, legacy.order.total_price);
  assert.equal(order.product_snapshot_source, "legacy-current-product");
  // Field clothing_type lama tidak boleh mengalahkan kategori baru setelah migrasi.
  await Product.updateOne({ _id: legacy.product._id }, { category: "Kaos" });
  await assertDataReady(mongoose.connection);
});

test("email bentrok dan produk tidak lengkap menolak apply tanpa perubahan parsial", async () => {
  await seed({ brand: undefined });
  await db()
    .collection("users")
    .insertOne({ name: "Bentrok", email: "legacy@example.test", password: hash, role: "buyer" });
  const before = await dump();
  const plan = await inspectLegacyData(mongoose.connection);
  assert.equal(plan.issues.filter((entry) => entry.code === "EMAIL_COLLISION").length, 2);
  assert.ok(
    plan.issues.some((entry) => entry.collection === "products" && entry.fields.includes("brand")),
  );
  await assert.rejects(migrateLegacyData(mongoose.connection, true), {
    code: "DATA_MIGRATION_REQUIRED",
  });
  assert.deepEqual(await dump(), before);
});

test("galat saat menulis produk membatalkan normalisasi email dan salinan order dalam transaksi yang sama", async () => {
  await seed();
  const before = await dump();
  await db().command({
    collMod: "products",
    validator: { requiredProbe: { $exists: true } },
    validationLevel: "strict",
    validationAction: "error",
  });
  try {
    await assert.rejects(migrateLegacyData(mongoose.connection, true));
    assert.deepEqual(await dump(), before);
  } finally {
    await db().command({ collMod: "products", validator: {}, validationLevel: "off" });
  }
});

test("produk inactive lama dipetakan ke active false tanpa menghapus foto atau ID", async () => {
  const legacy = await seed({ status: "inactive", category: "Pakaian", clothing_type: "Jaket" });
  await migrateLegacyData(mongoose.connection, true);
  const product = await Product.findById(legacy.product._id);
  assert.equal(product.active, false);
  assert.equal(product.status, "available");
  assert.equal(product.category, "Jaket");
  assert.deepEqual([...product.images], [legacy.product.image_url]);
  await assertDataReady(mongoose.connection);
});

test("referensi order hilang dan kategori ambigu dilaporkan, bukan diperbaiki dengan tebakan", async () => {
  const legacy = await seed({ clothing_type: "Kaos" });
  const plan = await inspectLegacyData(mongoose.connection);
  assert.ok(plan.issues.some((entry) => entry.code === "CATEGORY_CONFLICT"));
  await db().collection("products").deleteOne({ _id: legacy.product._id });
  const missing = await inspectLegacyData(mongoose.connection);
  assert.ok(
    missing.issues.some(
      (entry) => entry.collection === "orders" && entry.fields.includes("product_id"),
    ),
  );
  await assert.rejects(migrateLegacyData(mongoose.connection, true));
});

test("startup menghentikan server sebelum listen jika data lama belum diperiksa", async () => {
  await seed();
  await assert.rejects(
    run(process.execPath, [path.join(__dirname, "../webthrift.js")], {
      env: { ...process.env, NODE_ENV: "test", MONGODB_URI: uri, JWT_SECRET: secret, PORT: "0" },
      timeout: 15000,
    }),
    (error) => {
      assert.equal(error.code, 1);
      assert.equal(error.stdout, "");
      assert.match(error.stderr, /migrate:legacy/);
      assert.ok(!error.stderr.includes(hash));
      return true;
    },
  );
});

test("CLI memakai dry-run secara default dan --apply bersifat idempoten", async () => {
  await seed();
  const script = path.join(__dirname, "../scripts/migrate-legacy.js");
  const options = { env: { ...process.env, NODE_ENV: "test", MONGODB_URI: uri }, timeout: 15000 };
  const before = await dump();
  const preview = JSON.parse((await run(process.execPath, [script], options)).stdout);
  assert.equal(preview.mode, "dry-run");
  assert.equal(preview.summary.products, 1);
  assert.deepEqual(await dump(), before);
  const applied = JSON.parse((await run(process.execPath, [script, "--apply"], options)).stdout);
  assert.equal(applied.mode, "applied");
  assert.equal(applied.summary.users, 1);
  const again = JSON.parse((await run(process.execPath, [script, "--apply"], options)).stdout);
  assert.deepEqual(again.summary, { users: 0, products: 0, orders: 0, blockers: 0 });
});
