const { before, beforeEach, after, test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const path = require("node:path");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { MongoMemoryReplSet, MongoMemoryServer } = require("mongodb-memory-server");
const { start } = require("../webthrift");
const User = require("../models/user");
const Product = require("../models/products");
const Order = require("../models/order");
const Wishlist = require("../models/wishlist");
const { expireOrders } = require("../services/orders");
const { inspectLegacyData, assertDataReady, migrateLegacyData } = require("../lib/legacy-data");
const { STATUSES, PAYMENT_WINDOW_MS } = require("../lib/order-options");
const { productInput, addressInput, orderInput } = require("./fixtures");

const secret = randomBytes(48).toString("hex");
let mongo, server, buyer, other, admin, token, otherToken, adminToken, product;
const db = () => mongoose.connection.db;
async function request(route, { method = "GET", body, token } = {}) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api${route}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = { status: response.status, ...(await response.json()) };
  assert.equal(result.success, response.ok);
  return result;
}
const place = (overrides = {}, who = token) =>
  request("/orders", {
    method: "POST",
    token: who,
    body: { product_id: product.id, ...overrides },
  });
const cancel = (id, who = token) =>
  request(`/orders/${id}/cancel`, { method: "POST", token: who, body: {} });
const backdate = (id) => {
  const expiresAt = new Date(Date.now() - 1000);
  return Order.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(id) },
    { $set: { createdAt: new Date(expiresAt.getTime() - PAYMENT_WINDOW_MS), expiresAt } },
  );
};
before(async () => {
  mongo = await MongoMemoryReplSet.create({ binary: { version: "8.2.6" }, replSet: { count: 1 } });
  server = await start({
    mongoUri: mongo.getUri("orders_qa"),
    jwtSecret: secret,
    port: 0,
    nodeEnv: "test",
  });
});
beforeEach(async () => {
  for (const name of ["users", "products", "orders", "wishlists"])
    await db().collection(name).deleteMany({});
  [buyer, other, admin] = await User.create([
    { name: "Buyer QA", email: "buyer@example.test", password: "fixture", address: addressInput() },
    { name: "Other QA", email: "other@example.test", password: "fixture", address: addressInput() },
    { name: "Admin QA", email: "admin@example.test", password: "fixture", role: "admin" },
  ]);
  [token, otherToken, adminToken] = [buyer, other, admin].map((user) =>
    jwt.sign({ id: user.id }, secret),
  );
  product = await Product.create(productInput());
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test("checkout: harga server, ongkir, deadline tepat 6 jam dan snapshot tetap", async () => {
  const placed = await place();
  assert.equal(placed.status, 201);
  const order = placed.data;
  assert.equal(order.status, "MENUNGGU_PEMBAYARAN");
  assert.equal(order.buyer_id, buyer.id);
  assert.equal(order.item_price, product.price);
  assert.equal(order.shipping_fee, 15000);
  assert.equal(order.total_price, product.price + 15000);
  assert.equal(new Date(order.expiresAt) - new Date(order.createdAt), PAYMENT_WINDOW_MS);
  assert.deepEqual(order.address_snapshot, addressInput());
  const stored = await Product.findById(product.id);
  assert.equal(stored.status, "reserved");
  assert.equal(String(stored.reservation_order_id), order.id);
  assert.ok(!JSON.stringify(order).includes("reservation_order_id"));
  await User.updateOne(
    { _id: buyer.id },
    { address: { ...addressInput(), street: "Alamat baru" } },
  );
  await Product.updateOne({ _id: product.id }, { name: "Nama baru" });
  const read = await request(`/orders/${order.id}`, { token });
  assert.deepEqual(read.data.address_snapshot, order.address_snapshot);
  assert.deepEqual(read.data.product_id, order.product_id);
  await assertDataReady(mongoose.connection);
});
test("checkout: alamat request bisa berbeda dari profil, akun tanpa profil tidak bisa lanjut", async () => {
  await User.updateOne({ _id: buyer.id }, { address: null });
  assert.equal((await place()).status, 422);
  assert.equal(await Order.countDocuments(), 0);
  const address = { ...addressInput(), recipient: "Penerima Lain", street: "Alamat sekali pakai" };
  const result = await place({ address });
  assert.equal(result.status, 201);
  assert.deepEqual(result.data.address_snapshot, address);
  assert.equal((await User.findById(buyer.id)).address, null);
});
test("checkout: dua Buyer bersamaan dan submit ulang hanya membuat satu order", async () => {
  const results = await Promise.all([place(), place({}, otherToken)]);
  assert.deepEqual(results.map((x) => x.status).sort(), [201, 409]);
  assert.equal(results.find((x) => x.status === 409).code, "STOCK_CONFLICT");
  assert.equal(await Order.countDocuments(), 1);
  assert.equal((await place()).status, 409);
  assert.equal(await Order.countDocuments(), 1);
  const order = await Order.findOne();
  assert.equal(String((await Product.findById(product.id)).reservation_order_id), order.id);
});
test("checkout: submit bersamaan Buyer yang sama juga tidak menduplikasi order", async () => {
  assert.deepEqual((await Promise.all([place(), place()])).map((x) => x.status).sort(), [201, 409]);
  assert.equal(await Order.countDocuments(), 1);
});
test("checkout: gagal insert order rollback kunci dan harga produk", async () => {
  await db().command({
    collMod: "orders",
    validator: { forcedFailure: { $exists: true } },
    validationLevel: "strict",
    validationAction: "error",
  });
  try {
    const result = await place();
    assert.equal(result.status, 500);
    assert.equal(result.code, "INTERNAL_ERROR");
    assert.ok(!JSON.stringify(result).includes("forcedFailure"));
    assert.equal(await Order.countDocuments(), 0);
    const stored = await Product.findById(product.id);
    assert.equal(stored.status, "available");
    assert.equal(stored.reservation_order_id, null);
    assert.equal(stored.__v, product.__v);
  } finally {
    await db().command({ collMod: "orders", validator: {}, validationLevel: "off" });
  }
  assert.equal((await place()).status, 201);
});
test("checkout: total di luar batas integer aman ditolak tanpa mengunci stok", async () => {
  await Product.updateOne({ _id: product.id }, { price: Number.MAX_SAFE_INTEGER });
  const result = await place();
  assert.equal(result.status, 409);
  assert.equal(result.code, "PRICE_UNSUPPORTED");
  assert.equal(await Order.countDocuments(), 0);
  assert.equal((await Product.findById(product.id)).reservation_order_id, null);
});
for (const change of [
  { buyer_id: "fake" },
  { total_price: 1 },
  { item_price: 1 },
  { shipping_fee: 0 },
  { status: "SELESAI" },
  { expiresAt: "2099-01-01" },
  { address: {} },
  { address: null },
  { product_id: "bad" },
]) {
  test(`checkout menolak manipulasi ${JSON.stringify(change)}`, async () => {
    assert.equal((await place(change)).status, 422);
    assert.equal(await Order.countDocuments(), 0);
    assert.equal((await Product.findById(product.id)).status, "available");
  });
}
test("checkout: produk hilang/nonaktif 404, sold 409, peran salah 403", async () => {
  assert.equal((await place({ product_id: new mongoose.Types.ObjectId().toString() })).status, 404);
  await Product.updateOne({ _id: product.id }, { active: false });
  assert.equal((await place()).status, 404);
  await Product.updateOne({ _id: product.id }, { active: true, status: "sold" });
  assert.equal((await place()).status, 409);
  assert.equal((await place({}, adminToken)).status, 403);
  assert.equal((await place({}, null)).status, 401);
});
test("cancel: stok dilepas, pemesanan ulang aman, cancel lama tidak melepas order baru", async () => {
  const first = (await place()).data;
  const cancelled = await cancel(first.id);
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.data.status, "DIBATALKAN");
  assert.equal(cancelled.data.cancellation_reason, "buyer");
  assert.ok(cancelled.data.cancelledAt);
  const second = (await place({}, otherToken)).data;
  const repeat = await cancel(first.id);
  assert.deepEqual(repeat.data, cancelled.data);
  assert.equal(String((await Product.findById(product.id)).reservation_order_id), second.id);
  assert.equal((await Product.findById(product.id)).status, "reserved");
});
test("cancel: dua cancel bersamaan idempoten, expiry/cancel bersamaan konsisten", async () => {
  const first = (await place()).data;
  const results = await Promise.all([cancel(first.id), cancel(first.id)]);
  assert.deepEqual(
    results.map((x) => x.status),
    [200, 200],
  );
  assert.deepEqual(results[0].data, results[1].data);
  const second = (await place()).data;
  await backdate(second.id);
  await Promise.all([expireOrders(), cancel(second.id)]);
  const order = await Order.findById(second.id);
  assert.equal(order.status, "DIBATALKAN");
  assert.equal(order.cancellation_reason, "expired");
  assert.equal((await Product.findById(product.id)).status, "available");
});
test("cancel: akses akun lain/peran/ID salah dan menolak body asing", async () => {
  const first = (await place()).data;
  assert.equal((await cancel(first.id, otherToken)).status, 403);
  assert.equal((await cancel(first.id, adminToken)).status, 403);
  assert.equal((await cancel(first.id, null)).status, 401);
  assert.equal((await cancel("bad")).status, 422);
  assert.equal((await cancel(new mongoose.Types.ObjectId().toString())).status, 404);
  assert.equal(
    (
      await request(`/orders/${first.id}/cancel`, {
        method: "POST",
        token,
        body: { buyer_id: other.id },
      })
    ).status,
    422,
  );
  assert.equal((await Product.findById(product.id)).status, "reserved");
});
for (const status of STATUSES.filter((x) => !["MENUNGGU_PEMBAYARAN", "DIBATALKAN"].includes(x))) {
  test(`cancel/expiry tidak berlaku untuk ${status}`, async () => {
    const first = (await place()).data;
    await Order.updateOne({ _id: first.id }, { status });
    await backdate(first.id);
    assert.equal((await cancel(first.id)).status, 409);
    await expireOrders(new Date("2100-01-01"));
    assert.equal((await Order.findById(first.id)).status, status);
    assert.equal((await Product.findById(product.id)).status, "reserved");
  });
}
test("expiry: 1 ms sebelum deadline tetap terkunci, tepat deadline dilepas sekali", async () => {
  const first = (await place()).data;
  await expireOrders(new Date(new Date(first.expiresAt).getTime() - 1));
  assert.equal((await Order.findById(first.id)).status, "MENUNGGU_PEMBAYARAN");
  await Promise.all([
    expireOrders(new Date(first.expiresAt)),
    expireOrders(new Date(first.expiresAt)),
  ]);
  const stored = await Order.findById(first.id);
  assert.equal(stored.status, "DIBATALKAN");
  assert.equal(stored.cancellation_reason, "expired");
  assert.equal((await Product.findById(product.id)).status, "available");
  const version = (await Product.findById(product.id)).__v;
  await expireOrders(new Date("2100-01-01"));
  assert.equal((await Product.findById(product.id)).__v, version);
});
for (const route of [
  "/products",
  "/product-detail",
  "/admin/products",
  "/orders/my",
  "/order-detail",
  "/admin/orders",
  "/wishlist",
  "/products/match",
]) {
  test(`expiry dipicu pembacaan ${route}`, async () => {
    const first = (await place()).data;
    await Wishlist.create({ user_id: buyer.id, product_id: product.id });
    await backdate(first.id);
    const actualRoute =
      route === "/product-detail"
        ? `/products/${product.id}`
        : route === "/order-detail"
          ? `/orders/${first.id}`
          : route;
    const response = await request(actualRoute, {
      token: route.startsWith("/admin") ? adminToken : token,
      ...(route === "/products/match" ? { method: "POST", body: { category: "Jaket" } } : {}),
    });
    assert.equal(response.status, 200);
    assert.equal((await Order.findById(first.id)).status, "DIBATALKAN");
    assert.equal((await Product.findById(product.id)).status, "available");
  });
}
test("expiry dipicu checkout dan barang langsung bisa dipesan ulang", async () => {
  const first = (await place()).data;
  await backdate(first.id);
  const second = await place({}, otherToken);
  assert.equal(second.status, 201);
  assert.equal((await Order.findById(first.id)).cancellation_reason, "expired");
  assert.equal(String((await Product.findById(product.id)).reservation_order_id), second.data.id);
});
test("cancel/expiry tidak melepas kunci order lain pada data yang tidak konsisten", async () => {
  for (const expired of [false, true]) {
    const first = (await place()).data;
    const alienId = new mongoose.Types.ObjectId();
    await Product.updateOne({ _id: product.id }, { reservation_order_id: alienId });
    if (expired) {
      await backdate(first.id);
      await expireOrders();
    } else assert.equal((await cancel(first.id)).status, 200);
    const stored = await Product.findById(product.id);
    assert.equal(stored.status, "reserved");
    assert.equal(String(stored.reservation_order_id), String(alienId));
    await Product.updateOne(
      { _id: product.id },
      { status: "available", reservation_order_id: null },
    );
  }
});
test("kegagalan melepas produk rollback pembatalan dan expiry", async () => {
  const first = (await place()).data;
  await db().command({
    collMod: "products",
    validator: { status: { $eq: "reserved" } },
    validationLevel: "strict",
    validationAction: "error",
  });
  try {
    assert.equal((await cancel(first.id)).status, 500);
    assert.equal((await Order.findById(first.id)).status, "MENUNGGU_PEMBAYARAN");
    await backdate(first.id);
    await assert.rejects(expireOrders());
    assert.equal((await Order.findById(first.id)).status, "MENUNGGU_PEMBAYARAN");
    assert.equal((await Product.findById(product.id)).status, "reserved");
  } finally {
    await db().command({ collMod: "products", validator: {}, validationLevel: "off" });
  }
  assert.equal((await cancel(first.id)).data.cancellation_reason, "expired");
});
test("Admin tidak dapat mengubah status bebas pada endpoint lama", async () => {
  const first = (await place()).data;
  for (const status of ["paid", "SELESAI", "DIBATALKAN", "banana"]) {
    assert.equal(
      (
        await request(`/admin/orders/${first.id}/status`, {
          method: "PATCH",
          token: adminToken,
          body: { status },
        })
      ).status,
      409,
    );
  }
  assert.equal((await Order.findById(first.id)).status, "MENUNGGU_PEMBAYARAN");
  assert.equal(
    (await request(`/admin/orders/${first.id}/status`, { method: "PATCH", token, body: {} }))
      .status,
    403,
  );
});
test("migrasi: field wajib/harga/status ambigu menjadi blocker tanpa tebakan", async () => {
  await place();
  await assertDataReady(mongoose.connection);
  const original = await Order.collection.findOne();
  for (const [change, code] of [
    [{ $unset: { address_snapshot: "" } }, "ORDER_REVIEW_REQUIRED"],
    [{ $unset: { item_price: "" } }, "ORDER_PRICE_REVIEW_REQUIRED"],
    [{ $unset: { shipping_fee: "" } }, "ORDER_PRICE_REVIEW_REQUIRED"],
    [{ $unset: { expiresAt: "" } }, "ORDER_REVIEW_REQUIRED"],
    [{ $set: { status: "paid" } }, "ORDER_REVIEW_REQUIRED"],
    [{ $set: { item_price: "75000" } }, "ORDER_PRICE_REVIEW_REQUIRED"],
  ]) {
    await Order.collection.replaceOne({ _id: original._id }, original);
    await Order.collection.updateOne({ _id: original._id }, change);
    const before = await Order.collection.findOne();
    const plan = await inspectLegacyData(mongoose.connection);
    assert.ok(plan.issues.some((x) => x.collection === "orders" && x.code === code));
    await assert.rejects(migrateLegacyData(mongoose.connection, true), {
      code: "DATA_MIGRATION_REQUIRED",
    });
    assert.deepEqual(await Order.collection.findOne(), before);
  }
});
test("migrasi: kepemilikan kunci salah terdeteksi tanpa mengubah order/produk", async () => {
  await place();
  await Product.updateOne(
    { _id: product.id },
    { reservation_order_id: new mongoose.Types.ObjectId() },
  );
  const plan = await inspectLegacyData(mongoose.connection);
  assert.ok(plan.issues.some((x) => x.code === "RESERVATION_REVIEW_REQUIRED"));
  await assert.rejects(assertDataReady(mongoose.connection), { code: "DATA_MIGRATION_REQUIRED" });
});
test("migrasi: deadline salah pada pending lama maupun status baru menjadi blocker tanpa perubahan", async () => {
  await place();
  const original = await Order.collection.findOne();
  for (const status of ["pending", "MENUNGGU_PEMBAYARAN"]) {
    for (const duration of [
      -1000,
      0,
      PAYMENT_WINDOW_MS - 1,
      PAYMENT_WINDOW_MS + 1,
      365 * 86400000,
    ]) {
      await Order.collection.replaceOne(
        { _id: original._id },
        { ...original, status, expiresAt: new Date(original.createdAt.getTime() + duration) },
      );
      const before = await Order.collection.findOne();
      const productBefore = await Product.collection.findOne({ _id: product._id });
      const plan = await inspectLegacyData(mongoose.connection);
      assert.ok(
        plan.issues.some(
          (x) => x.code === "ORDER_DEADLINE_REVIEW_REQUIRED" && x.fields.includes("expiresAt"),
        ),
      );
      await assert.rejects(assertDataReady(mongoose.connection), {
        code: "DATA_MIGRATION_REQUIRED",
      });
      await assert.rejects(migrateLegacyData(mongoose.connection, true), {
        code: "DATA_MIGRATION_REQUIRED",
      });
      assert.deepEqual(await Order.collection.findOne(), before);
      assert.deepEqual(await Product.collection.findOne({ _id: product._id }), productBefore);
    }
  }
  await Order.collection.replaceOne({ _id: original._id }, { ...original, status: "pending" });
  await migrateLegacyData(mongoose.connection, true);
  const migrated = await Order.collection.findOne();
  assert.equal(migrated.status, "MENUNGGU_PEMBAYARAN");
  assert.deepEqual(migrated.expiresAt, original.expiresAt);
  await assertDataReady(mongoose.connection);
});
test("model order menolak deadline rusak dan menerima tepat enam jam", async () => {
  const input = { ...orderInput(product), buyer_id: buyer._id, product_id: product._id };
  for (const duration of [-1000, 0, PAYMENT_WINDOW_MS - 1, PAYMENT_WINDOW_MS + 1, 365 * 86400000]) {
    const order = new Order({
      ...input,
      expiresAt: new Date(input.createdAt.getTime() + duration),
    });
    await assert.rejects(order.validate(), (error) => Boolean(error.errors?.expiresAt));
  }
  await new Order(input).validate();
  assert.equal(await Order.countDocuments(), 0);
});
test("migrasi/expiry tidak membatalkan verifikasi atau unggah ulang setelah deadline awal", async () => {
  const first = (await place()).data;
  await backdate(first.id);
  for (const status of ["MENUNGGU_VERIFIKASI", "PERLU_UNGGAH_ULANG"]) {
    await Order.updateOne({ _id: first.id }, { status });
    const plan = await inspectLegacyData(mongoose.connection);
    assert.ok(!plan.issues.some((x) => x.code === "ORDER_DEADLINE_REVIEW_REQUIRED"));
    await expireOrders(new Date("2100-01-01"));
    assert.equal((await Order.findById(first.id)).status, status);
    assert.equal(String((await Product.findById(product.id)).reservation_order_id), first.id);
  }
});
test("startup standalone ditolak sebelum port dibuka dengan pesan replica set", async () => {
  const standalone = await MongoMemoryServer.create({ binary: { version: "8.2.6" } });
  try {
    await assert.rejects(
      promisify(execFile)(process.execPath, [path.join(__dirname, "../webthrift.js")], {
        env: {
          ...process.env,
          NODE_ENV: "test",
          MONGODB_URI: standalone.getUri(),
          JWT_SECRET: secret,
          PORT: "0",
        },
        timeout: 15000,
      }),
      (error) => {
        assert.equal(error.code, 1);
        assert.match(error.stderr, /REPLICA_SET_REQUIRED/);
        assert.equal(error.stdout, "");
        return true;
      },
    );
  } finally {
    await standalone.stop();
  }
});
