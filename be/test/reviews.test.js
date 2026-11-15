const { FormData, Blob } = globalThis;
const { before, beforeEach, after, test } = require("node:test");
const assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  os = require("node:os"),
  path = require("node:path"),
  mongoose = require("mongoose"),
  bcrypt = require("bcryptjs"),
  jwt = require("jsonwebtoken"),
  sharp = require("sharp");
const { MongoMemoryReplSet } = require("mongodb-memory-server"),
  { start } = require("../webthrift"),
  User = require("../models/user"),
  Product = require("../models/products"),
  Order = require("../models/order"),
  Review = require("../models/review"),
  { productInput, addressInput } = require("./fixtures"),
  { inspectLegacyData, migrateLegacyData, assertDataReady } = require("../lib/legacy-data");
let mongo, server, dir, png, buyer, other, admin, token, otherToken, adminToken, product, hash;
const secret = require("node:crypto").randomBytes(48).toString("hex");
async function api(route, method = "GET", body, who = token) {
  const form = body instanceof FormData;
  const r = await fetch("http://127.0.0.1:" + server.address().port + "/api" + route, {
    method,
    headers: {
      ...(who ? { Authorization: "Bearer " + who } : {}),
      ...(!form && body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: form ? body : body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, ...(await r.json()) };
}
async function place() {
  const r = await api("/orders", "POST", { product_id: product.id });
  assert.equal(r.status, 201);
  return r.data;
}
async function complete() {
  const o = await place(),
    form = new FormData();
  form.append("file", new Blob([png], { type: "image/png" }), "proof.png");
  const up = await api("/orders/" + o.id + "/payment-proof", "POST", form);
  assert.equal(up.status, 200);
  assert.equal(
    (
      await api(
        "/admin/orders/" + o.id + "/actions",
        "POST",
        { type: "approve", proofId: up.data.proof.id },
        adminToken,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await api(
        "/admin/orders/" + o.id + "/actions",
        "POST",
        { type: "ship", service: "JNE REG", number: "JNE12345678" },
        adminToken,
      )
    ).status,
    200,
  );
  const received = await api("/orders/" + o.id + "/receive", "POST", {});
  assert.equal(received.status, 200);
  return received.data;
}
const review = (id, body = { rating: 5, comment: "Barang sesuai deskripsi." }, who = token) =>
  api("/orders/" + id + "/review", "POST", body, who);
before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "pickathrift-reviews-"));
  mongo = await MongoMemoryReplSet.create({ binary: { version: "8.2.6" }, replSet: { count: 1 } });
  server = await start({
    mongoUri: mongo.getUri("review_qa"),
    jwtSecret: secret,
    port: 0,
    nodeEnv: "test",
    uploadDir: dir,
  });
  hash = await bcrypt.hash("Fictional123!", 10);
  png = await sharp({ create: { width: 10, height: 10, channels: 3, background: "red" } })
    .png()
    .toBuffer();
});
beforeEach(async () => {
  for (const name of ["reviews", "orders", "products", "users"])
    await mongoose.connection.db.collection(name).deleteMany({});
  [buyer, other, admin] = await User.create(
    ["buyer", "other", "admin"].map((name) => ({
      name,
      email: name + "@example.test",
      password: hash,
      address: addressInput(),
      role: name === "admin" ? "admin" : "buyer",
    })),
  );
  [token, otherToken, adminToken] = [buyer, other, admin].map((u) =>
    jwt.sign({ id: u.id }, secret),
  );
  product = await Product.create(productInput());
});
after(async () => {
  if (server) await new Promise((r) => server.close(r));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  await fs.rm(dir, { recursive: true, force: true });
});
test("full API journey: register -> profile -> catalog/match/wishlist -> order -> proof -> approve -> ship -> receive -> review", async () => {
  const credentials = { name: "Buyer E2E", email: "e2e@example.test", password: "Fictional123!" };
  assert.equal((await api("/auth/register", "POST", credentials, null)).status, 201);
  token = (await api("/auth/login", "POST", credentials, null)).data.token;
  adminToken = (
    await api(
      "/auth/login",
      "POST",
      { email: admin.email, password: "Fictional123!", role: "admin" },
      null,
    )
  ).data.token;
  assert.equal((await api("/users/me", "PATCH", { address: addressInput() })).status, 200);
  const created = await api("/products", "POST", productInput(), adminToken);
  assert.equal(created.status, 201);
  product = { id: created.data.id };
  assert.ok((await api("/products")).data.items.some((x) => x.id === product.id));
  assert.ok(
    (await api("/products/match", "POST", { category: "Jaket" })).data.some(
      (x) => x.product.id === product.id,
    ),
  );
  assert.equal((await api("/wishlist/" + product.id, "POST", {})).status, 201);
  const o = await complete(),
    sent = await review(o.id);
  assert.equal(sent.status, 201);
  assert.equal((await api("/orders/" + o.id)).data.review.id, sent.data.id);
  assert.equal((await api("/orders/my")).data[0].review.id, sent.data.id);
  assert.equal(
    (await api("/admin/orders", "GET", undefined, adminToken)).data[0].review.id,
    sent.data.id,
  );
  const pub = await api("/reviews", "GET", undefined, null);
  assert.equal(pub.status, 200);
  assert.deepEqual(
    Object.keys(pub.data[0]).sort(),
    ["id", "author", "rating", "comment", "createdAt"].sort(),
  );
  assert.equal(pub.data[0].author, "Buyer E2E");
  assert.ok(!JSON.stringify(pub).includes(credentials.email));
  assert.ok(!JSON.stringify(pub).includes(addressInput().phone));
  assert.equal((await Product.findById(product.id)).status, "sold");
  await assertDataReady(mongoose.connection, { uploadDir: dir });
});
test("two simultaneous reviews produce exactly one 201 and one 409; repeat stays rejected", async () => {
  const o = await complete();
  const results = await Promise.all([review(o.id), review(o.id)]);
  assert.deepEqual(results.map((x) => x.status).sort(), [201, 409]);
  assert.equal(results.find((x) => x.status === 409).code, "REVIEW_EXISTS");
  assert.equal(await Review.countDocuments({ order_id: o.id }), 1);
  assert.equal((await review(o.id)).status, 409);
});
test("all unfinished statuses reject review; wrong owner and roles cannot submit", async () => {
  const o = await place();
  for (const status of [
    "MENUNGGU_PEMBAYARAN",
    "MENUNGGU_VERIFIKASI",
    "PERLU_UNGGAH_ULANG",
    "DIPROSES",
    "DIKIRIM",
    "DIBATALKAN",
  ]) {
    await Order.updateOne({ _id: o.id }, { status });
    assert.equal((await review(o.id)).status, 409);
  }
  assert.equal((await review(o.id, undefined, otherToken)).status, 403);
  assert.equal((await review(o.id, undefined, adminToken)).status, 403);
  assert.equal((await review(o.id, undefined, null)).status, 401);
  assert.equal((await review("bad")).status, 422);
  assert.equal((await review(new mongoose.Types.ObjectId().toString())).status, 404);
  assert.equal(await Review.countDocuments(), 0);
});
test("invalid rating/type/length/fields rejected; min/max inclusive after trim", async () => {
  const o = await complete();
  for (const body of [
    { rating: 0, comment: "Barang bagus sekali" },
    { rating: 6, comment: "Barang bagus sekali" },
    { rating: 4.5, comment: "Barang bagus sekali" },
    { rating: "5", comment: "Barang bagus sekali" },
    { rating: 5, comment: "a".repeat(9) },
    { rating: 5, comment: "a".repeat(501) },
    { rating: 5, comment: [] },
    { rating: 5, comment: "          " },
    { rating: 5, comment: "a".repeat(10), buyer_id: other.id },
  ])
    assert.equal((await review(o.id, body)).status, 422);
  assert.equal(await Review.countDocuments(), 0);
  const first = await review(o.id, { rating: 1, comment: "  " + "a".repeat(10) + "  " });
  assert.equal(first.status, 201);
  assert.equal(first.data.comment.length, 10);
  product = await Product.create(productInput());
  const second = await complete();
  assert.equal((await review(second.id, { rating: 5, comment: "b".repeat(500) })).status, 201);
  const pub = await api("/reviews", "GET", undefined, null);
  assert.deepEqual(
    pub.data.map((x) => x.rating),
    [5, 1],
  );
});
test("model validation rejects fractional rating and short/long text", async () => {
  for (const input of [
    { rating: 2.5, comment: "Barang bagus sekali" },
    { rating: 5, comment: "short" },
    { rating: 5, comment: "a".repeat(501) },
  ])
    await assert.rejects(
      new Review({
        order_id: new mongoose.Types.ObjectId(),
        buyer_id: buyer._id,
        ...input,
      }).validate(),
    );
  assert.equal(await Review.countDocuments(), 0);
});
test("legacy duplicate/invalid ownership/rating/text/status block migration without writes", async () => {
  const o = await complete();
  await review(o.id);
  await Review.collection.dropIndex("order_id_1");
  try {
    const original = await Review.collection.findOne();
    await Review.collection.insertMany([
      { ...original, _id: new mongoose.Types.ObjectId() },
      {
        order_id: new mongoose.Types.ObjectId(),
        buyer_id: other._id,
        rating: 1.5,
        comment: "bad",
        createdAt: new Date(),
      },
    ]);
    const before = await Review.collection.find().toArray();
    const plan = await inspectLegacyData(mongoose.connection, undefined, { uploadDir: dir });
    assert.equal(plan.issues.filter((x) => x.code === "REVIEW_DUPLICATE").length, 2);
    assert.ok(plan.issues.some((x) => x.code === "REVIEW_REVIEW_REQUIRED"));
    await assert.rejects(migrateLegacyData(mongoose.connection, true, { uploadDir: dir }), {
      code: "DATA_MIGRATION_REQUIRED",
    });
    assert.deepEqual(await Review.collection.find().toArray(), before);
  } finally {
    await Review.deleteMany({});
    await Review.createIndexes();
  }
});
