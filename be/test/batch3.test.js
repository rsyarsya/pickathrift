const { before, beforeEach, after, test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const { start } = require("../webthrift");
const User = require("../models/user");
const Product = require("../models/products");
const Wishlist = require("../models/wishlist");
const { inspectLegacyData, migrateLegacyData, assertDataReady } = require("../lib/legacy-data");
const { productInput } = require("./fixtures");

let mongo, server, buyer, other, admin, token, otherToken, adminToken;
const secret = randomBytes(48).toString("hex");
const address = {
  recipient: "Penerima QA",
  phone: "081234567890",
  street: "Jl. Uji 12",
  city: "Yogyakarta",
  postalCode: "55281",
};
async function request(route, { method = "GET", body, token } = {}) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api${route}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, ...(await response.json()) };
}
const match = (body) => request("/products/match", { method: "POST", body });
before(async () => {
  mongo = await MongoMemoryReplSet.create({ binary: { version: "8.2.6" }, replSet: { count: 1 } });
  server = await start({
    mongoUri: mongo.getUri("batch3_test"),
    jwtSecret: secret,
    port: 0,
    nodeEnv: "test",
  });
});
beforeEach(async () => {
  for (const name of ["users", "products", "orders", "wishlists"])
    await mongoose.connection.db.collection(name).deleteMany({});
  [buyer, other, admin] = await User.create([
    { name: "Buyer QA", email: "buyer@example.test", password: "fictional-hash" },
    { name: "Buyer Lain", email: "other@example.test", password: "fictional-hash" },
    { name: "Admin QA", email: "admin@example.test", password: "fictional-hash", role: "admin" },
  ]);
  [token, otherToken, adminToken] = [buyer, other, admin].map((user) =>
    jwt.sign({ id: user.id }, secret),
  );
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test("match: semua pengukuran wajib cocok, batas 2 cm inklusif, hanya aktif tersedia", async () => {
  const good = await Product.create(productInput());
  await Product.create([
    productInput({
      measurements: [
        { label: "Lebar dada", cm: 56.01 },
        { label: "Panjang", cm: 67 },
      ],
    }),
    productInput({ measurements: [{ label: "Lebar dada", cm: 54 }] }),
    productInput({ status: "reserved" }),
    productInput({ status: "sold" }),
    productInput({ active: false }),
  ]);
  const result = await match({
    category: "Jaket",
    measurements: [
      { label: "Lebar dada", cm: 54 },
      { label: "Panjang", cm: 69 },
    ],
  });
  assert.equal(result.status, 200);
  assert.deepEqual(
    result.data.map((x) => [x.product.id, x.diffCm]),
    [[good.id, 2]],
  );
});
test("match: ranking selisih lalu waktu lalu ID stabil, tanpa ukuran hasil terbaru", async () => {
  const date = new Date("2026-01-01");
  const a = await Product.create(productInput({ createdAt: date }));
  const b = await Product.create(productInput({ createdAt: date }));
  const c = await Product.create(productInput({ measurements: [{ label: "Lebar dada", cm: 55 }] }));
  const result = await match({
    category: "Jaket",
    measurements: [{ label: "Lebar dada", cm: 54 }],
  });
  assert.deepEqual(
    result.data.map((x) => x.product.id),
    [b.id, a.id, c.id],
  );
  assert.deepEqual(
    result.data.map((x) => x.diffCm),
    [0, 0, 1],
  );
  const plain = await match({ category: "Jaket" });
  assert.deepEqual(
    plain.data.map((x) => x.product.id),
    [c.id, b.id, a.id],
  );
  assert.ok(plain.data.every((x) => x.diffCm === 0));
});
test("match: Celana, desimal, preferensi dan batas anggaran inklusif", async () => {
  const product = await Product.create(
    productInput({
      category: "Celana",
      size: "30",
      measurements: [{ label: "Pinggang", cm: 40.5 }],
    }),
  );
  const criteria = {
    category: "Celana",
    style: "Kasual",
    size: "30",
    minPrice: 75000,
    maxPrice: 75000,
    measurements: [{ label: "Pinggang", cm: 40.5 }],
  };
  assert.equal((await match(criteria)).data[0].product.id, product.id);
  for (const change of [{ size: "32" }, { style: "Formal" }, { maxPrice: 74999, minPrice: 0 }])
    assert.deepEqual((await match({ ...criteria, ...change })).data, []);
});
for (const body of [
  {},
  { category: "Sepatu" },
  { category: ["Jaket"] },
  { category: "Jaket", size: "30" },
  { category: "Celana", size: "L" },
  { category: "Jaket", minPrice: -1 },
  { category: "Jaket", minPrice: 2, maxPrice: 1 },
  { category: "Jaket", maxPrice: "100" },
  { category: "Jaket", measurements: null },
  { category: "Jaket", measurements: {} },
  ...[0, -1, 200.1, "54", null].map((cm) => ({
    category: "Jaket",
    measurements: [{ label: "Lebar dada", cm }],
  })),
  { category: "Jaket", measurements: [{ label: "Pinggang", cm: 40 }] },
  {
    category: "Jaket",
    measurements: [
      { label: "Bahu", cm: 40 },
      { label: "Bahu", cm: 41 },
    ],
  },
  { category: "Jaket", clothing_type: "Jaket" },
  { category: "Jaket", style: { $ne: null } },
])
  test(`match menolak input ${JSON.stringify(body)}`, async () =>
    assert.equal((await match(body)).status, 422));

test("wishlist: penambahan bersamaan unik, akun terpisah, sold tetap terbaca", async () => {
  const product = await Product.create(productInput());
  const route = `/wishlist/${product.id}`;
  const results = await Promise.all(
    [1, 2].map(() => request(route, { method: "POST", body: {}, token })),
  );
  assert.deepEqual(results.map((x) => x.status).sort(), [201, 409]);
  assert.equal(await Wishlist.countDocuments(), 1);
  assert.equal((await request("/wishlist", { token: otherToken })).data.length, 0);
  assert.equal((await request(route, { method: "DELETE", token: otherToken })).status, 404);
  assert.equal((await request(route, { method: "POST", body: {}, token: otherToken })).status, 201);
  await Product.updateOne({ _id: product.id }, { status: "sold" });
  const own = (await request("/wishlist", { token })).data[0];
  assert.equal(own.product_id.status, "sold");
  assert.equal(own.unavailable, false);
  assert.equal((await request(route, { method: "DELETE", token })).status, 200);
  assert.equal((await request("/wishlist", { token: otherToken })).data.length, 1);
});
test("wishlist: produk nonaktif/hilang tidak membocorkan detail, bisa dihapus", async () => {
  const product = await Product.create(productInput());
  const route = `/wishlist/${product.id}`;
  assert.equal((await request(route, { method: "POST", body: {}, token })).status, 201);
  for (const remove of [false, true]) {
    if (remove) await Product.deleteOne({ _id: product.id });
    else await Product.updateOne({ _id: product.id }, { active: false });
    assert.equal(
      (await request(route, { method: "POST", body: {}, token: otherToken })).status,
      404,
    );
    const item = (await request("/wishlist", { token })).data[0];
    assert.equal(item.product_id, null);
    assert.equal(item.productId, product.id);
    assert.equal(item.unavailable, true);
  }
  assert.equal((await request(route, { method: "DELETE", token })).status, 200);
  assert.equal((await request("/wishlist", { token })).data.length, 0);
  assert.equal((await request(route, { method: "POST", body: {}, token: adminToken })).status, 403);
  assert.equal((await request(route, { method: "POST", body: {} })).status, 401);
});

test("profil: alamat lengkap dinormalisasi, disimpan dan terpisah dari nama/akun lain", async () => {
  const result = await request("/users/me", {
    method: "PATCH",
    token,
    body: { address: { ...address, recipient: " Penerima Baru ", phone: "0812 (3456)-7890" } },
  });
  assert.equal(result.status, 200);
  assert.equal(result.data.name, buyer.name);
  assert.deepEqual(result.data.address, { ...address, recipient: "Penerima Baru" });
  assert.deepEqual((await request("/users/me", { token })).data.address, result.data.address);
  assert.equal((await request("/users/me", { token: otherToken })).data.address, null);
  const next = await request("/users/me", { method: "PATCH", token, body: { address } });
  assert.deepEqual(next.data.address, address);
});
for (const value of [
  null,
  "Jl. Lama",
  {},
  { ...address, city: " " },
  { ...address, phone: "628123456789" },
  { ...address, phone: "081234567" },
  { ...address, phone: "08123456789012" },
  { ...address, postalCode: "55a81" },
  { ...address, recipient: 123 },
  { ...address, role: "admin" },
]) {
  test(`alamat tidak valid ${JSON.stringify(value)}`, async () => {
    assert.equal(
      (await request("/users/me", { method: "PATCH", token, body: { address: value } })).status,
      422,
    );
    assert.equal((await User.findById(buyer.id)).address, null);
    assert.equal(
      (
        await request("/auth/register", {
          method: "POST",
          body: {
            name: "Baru",
            email: "new@example.test",
            password: "Fictional123!",
            address: value,
          },
        })
      ).status,
      422,
    );
  });
}
test("registrasi alamat valid, login/read mengembalikan DTO tanpa field internal", async () => {
  const account = { name: "Baru", email: "new@example.test", password: "Fictional123!", address };
  const registered = await request("/auth/register", { method: "POST", body: account });
  assert.equal(registered.status, 201);
  assert.deepEqual(registered.data.address, address);
  const logged = await request("/auth/login", { method: "POST", body: account });
  assert.deepEqual(logged.data.user.address, address);
  assert.ok(!/legacy_address|password|__v|_id/.test(JSON.stringify(logged.data.user)));
});

test("migrasi: arsip alamat utuh, dry-run read-only, apply idempotent dan akun tetap bisa dibaca", async () => {
  await User.collection.updateOne(
    { _id: buyer._id },
    { $set: { address: "Alamat lama tanpa kode pos" } },
  );
  assert.equal((await inspectLegacyData(mongoose.connection)).summary.users, 1);
  assert.equal(
    (await User.collection.findOne({ _id: buyer._id })).address,
    "Alamat lama tanpa kode pos",
  );
  await migrateLegacyData(mongoose.connection, true);
  const raw = await User.collection.findOne({ _id: buyer._id });
  assert.equal(raw.legacy_address, "Alamat lama tanpa kode pos");
  assert.equal(raw.address, null);
  assert.equal((await inspectLegacyData(mongoose.connection)).summary.users, 0);
  await assertDataReady(mongoose.connection);
  const profile = await request("/users/me", { token });
  assert.equal(profile.status, 200);
  assert.equal(profile.data.address, null);
  assert.ok(!JSON.stringify(profile).includes("Alamat lama"));
});
test("migrasi: wishlist rusak/duplikat menghalangi apply tanpa menghapus data", async () => {
  await Wishlist.collection.dropIndex("user_id_1_product_id_1");
  try {
    const id = new mongoose.Types.ObjectId();
    await Wishlist.collection.insertMany([
      { user_id: buyer._id, product_id: id },
      { user_id: buyer._id, product_id: id },
      { user_id: admin._id, product_id: id },
    ]);
    const plan = await inspectLegacyData(mongoose.connection);
    assert.equal(plan.issues.filter((x) => x.code === "WISHLIST_DUPLICATE").length, 2);
    assert.equal(
      plan.issues.filter((x) => x.code === "WISHLIST_PRODUCT_REVIEW_REQUIRED").length,
      3,
    );
    assert.equal(plan.issues.filter((x) => x.code === "WISHLIST_OWNER_REVIEW_REQUIRED").length, 1);
    await assert.rejects(migrateLegacyData(mongoose.connection, true), {
      code: "DATA_MIGRATION_REQUIRED",
    });
    assert.equal(await Wishlist.countDocuments(), 3);
  } finally {
    await Wishlist.deleteMany({});
    await Wishlist.createIndexes();
  }
});
