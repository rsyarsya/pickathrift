const { FormData, Blob, AbortSignal } = globalThis;
const { before, beforeEach, after, test } = require("node:test");
const assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  os = require("node:os"),
  path = require("node:path"),
  mongoose = require("mongoose"),
  jwt = require("jsonwebtoken"),
  sharp = require("sharp");
const { MongoMemoryReplSet } = require("mongodb-memory-server"),
  { start } = require("../webthrift"),
  User = require("../models/user"),
  Product = require("../models/products"),
  Order = require("../models/order"),
  { productInput, addressInput } = require("./fixtures"),
  { inspectLegacyData, assertDataReady, migrateLegacyData } = require("../lib/legacy-data");
let mongo, server, dir, png, token, other, admin, product;
const secret = require("node:crypto").randomBytes(48).toString("hex");
async function api(route, method = "GET", body, who = token) {
  const form = body instanceof FormData;
  const r = await fetch("http://127.0.0.1:" + server.address().port + route, {
    method,
    headers: {
      ...(who ? { Authorization: "Bearer " + who } : {}),
      ...(!form && body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: form ? body : body === undefined ? undefined : JSON.stringify(body),
  });
  if (r.headers.get("content-type")?.startsWith("image/"))
    return { status: r.status, buffer: Buffer.from(await r.arrayBuffer()), headers: r.headers };
  return { status: r.status, ...(await r.json()), headers: r.headers };
}
const place = async () => {
  const r = await api("/api/orders", "POST", { product_id: product.id });
  assert.equal(r.status, 201);
  return r.data;
};
const upload = (id, buffer = png, mime = "image/png", who = token, count = 1) => {
  const form = new FormData();
  for (let i = 0; i < count; i++)
    form.append("file", new Blob([buffer], { type: mime }), "proof.png");
  return api("/api/orders/" + id + "/payment-proof", "POST", form, who);
};
const action = async (id, type, proofId, extra = {}) => {
  const current = await api("/api/orders/" + id);
  return api(
    "/api/admin/orders/" + id + "/actions",
    "POST",
    { type, version: current.data.version, ...(proofId ? { proofId } : {}), ...extra },
    admin,
  );
};
before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "pickathrift-payments-"));
  mongo = await MongoMemoryReplSet.create({ binary: { version: "8.2.6" }, replSet: { count: 1 } });
  server = await start({
    mongoUri: mongo.getUri("payments"),
    jwtSecret: secret,
    port: 0,
    nodeEnv: "test",
    uploadDir: dir,
  });
  png = await sharp({ create: { width: 10, height: 10, channels: 3, background: "red" } })
    .png()
    .toBuffer();
});
beforeEach(async () => {
  for (const name of ["orders", "products", "users"])
    await mongoose.connection.db.collection(name).deleteMany({});
  const users = await User.create(
    ["buyer", "other", "admin"].map((name) => ({
      name,
      email: name + "@example.test",
      password: "fixture",
      address: addressInput(),
      role: name === "admin" ? "admin" : "buyer",
    })),
  );
  [token, other, admin] = users.map((u) => jwt.sign({ id: u.id }, secret));
  product = await Product.create(productInput());
});
after(async () => {
  if (server) await new Promise((r) => server.close(r));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  await fs.rm(dir, { recursive: true, force: true });
});
test("complete Buyer-Admin lifecycle; private proof, sold stock, no duplicate receive", async () => {
  const o = await place(),
    up = await upload(o.id);
  assert.equal(up.status, 200);
  assert.equal(up.data.status, "MENUNGGU_VERIFIKASI");
  assert.ok(!JSON.stringify(up.data).includes("filename"));
  const url = up.data.proof.url;
  assert.equal((await api(url, "GET", undefined, null)).status, 401);
  assert.equal((await api(url, "GET", undefined, other)).status, 403);
  for (const who of [token, admin]) {
    const r = await api(url, "GET", undefined, who);
    assert.equal(r.status, 200);
    assert.equal((await sharp(r.buffer).metadata()).format, "png");
  }
  assert.equal((await api("/api/orders/" + o.id + "/cancel", "POST", {})).status, 409);
  assert.equal((await action(o.id, "approve", up.data.proof.id)).data.status, "DIPROSES");
  assert.equal((await Product.findById(product.id)).status, "sold");
  assert.equal((await Product.findById(product.id)).reservation_order_id, null);
  assert.equal(
    (await action(o.id, "ship", null, { service: "JNE REG", number: "JNE12345678" })).data.status,
    "DIKIRIM",
  );
  assert.equal((await api("/api/orders/" + o.id + "/receive", "POST", {}, other)).status, 403);
  assert.equal((await api("/api/orders/" + o.id + "/receive", "POST", {})).data.status, "SELESAI");
  assert.equal((await api("/api/orders/" + o.id + "/receive", "POST", {})).status, 409);
  assert.equal(
    (await inspectLegacyData(mongoose.connection, undefined, { uploadDir: dir })).issues.length,
    0,
  );
});
test("reupload JPEG and stale proofId; reject releases owned stock", async () => {
  const o = await place(),
    up = (await upload(o.id)).data;
  assert.equal(
    (await action(o.id, "reupload", up.proof.id, { note: "Buram" })).data.status,
    "PERLU_UNGGAH_ULANG",
  );
  const next = await upload(o.id, await sharp(png).jpeg().toBuffer(), "image/jpeg");
  assert.equal(next.status, 200);
  assert.notEqual(next.data.proof.id, up.proof.id);
  assert.equal((await action(o.id, "approve", up.proof.id)).status, 409);
  assert.equal(
    (await action(o.id, "reject", next.data.proof.id, { note: "Tidak ada dana masuk" })).data
      .cancellation_reason,
    "admin",
  );
  assert.equal((await Product.findById(product.id)).status, "available");
  assert.equal((await action(o.id, "approve", next.data.proof.id)).status, 409);
  await place();
});
test("concurrent uploads and Admin actions only commit once", async () => {
  const o = await place();
  assert.deepEqual(
    (await Promise.all([upload(o.id), upload(o.id)])).map((r) => r.status).sort(),
    [200, 409],
  );
  const current = (await api("/api/orders/" + o.id)).data;
  assert.deepEqual(
    (
      await Promise.all([
        action(o.id, "approve", current.proof.id),
        action(o.id, "reject", current.proof.id, { note: "Konflik" }),
      ])
    )
      .map((r) => r.status)
      .sort(),
    [200, 409],
  );
});
for (const bad of ["empty", "corrupt", "truncated", "mime", "large", "extra"]) {
  test("reject invalid file " + bad + " without leaking new files", async () => {
    const o = await place();
    const before = await fs.readdir(path.join(dir, "proofs")).catch(() => []);
    const r = await upload(
      o.id,
      bad === "empty"
        ? Buffer.alloc(0)
        : bad === "corrupt"
          ? Buffer.from("fake")
          : bad === "truncated"
            ? png.subarray(0, 35)
            : bad === "large"
              ? Buffer.alloc(2097153)
              : png,
      bad === "mime" ? "image/jpeg" : "image/png",
      token,
      bad === "extra" ? 2 : 1,
    );
    assert.equal(r.status, 422);
    assert.deepEqual(await fs.readdir(path.join(dir, "proofs")).catch(() => []), before);
    assert.equal((await Order.findById(o.id)).status, "MENUNGGU_PEMBAYARAN");
  });
}
test("exact 2 MiB upload accepted; expired upload rejected and stock released", async () => {
  const o = await place();
  assert.equal(
    (await upload(o.id, Buffer.concat([png, Buffer.alloc(2097152 - png.length)]))).status,
    200,
  );
  product = await Product.create(productInput());
  const second = await place(),
    expiresAt = new Date(Date.now() - 1000);
  await Order.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(second.id) },
    { $set: { createdAt: new Date(expiresAt - 21600000), expiresAt } },
  );
  assert.equal((await upload(second.id)).status, 409);
  assert.equal((await Product.findById(product.id)).status, "available");
});
test("upload ownership and role; proofs never public static", async () => {
  const o = await place();
  for (const [who, status] of [
    [null, 401],
    [other, 403],
    [admin, 403],
  ])
    assert.equal((await upload(o.id, png, "image/png", who)).status, status);
  await upload(o.id);
  const raw = await Order.findById(o.id);
  assert.equal(
    (await api("/uploads/proofs/" + raw.proof.filename, "GET", undefined, null)).status,
    404,
  );
});
test("public product photos count 1-4; invalid batch cleans newly saved files", async () => {
  for (const count of [1, 4, 5]) {
    const form = new FormData();
    for (let i = 0; i < count; i++)
      form.append("images", new Blob([png], { type: "image/png" }), "photo.png");
    const r = await api("/api/admin/product-images", "POST", form, admin);
    assert.equal(r.status, count === 5 ? 422 : 201);
    if (count < 5) {
      assert.equal(r.data.length, count);
      assert.equal((await api(r.data[0], "GET", undefined, null)).status, 200);
    }
  }
  const before = await fs.readdir(path.join(dir, "products"));
  const form = new FormData();
  form.append("images", new Blob([png], { type: "image/png" }), "ok.png");
  form.append("images", new Blob(["bad"], { type: "image/png" }), "bad.png");
  assert.equal((await api("/api/admin/product-images", "POST", form, admin)).status, 422);
  assert.deepEqual(await fs.readdir(path.join(dir, "products")), before);
});
test("validation, filters, wrong stock owner, missing file migration blocker", async () => {
  const o = await place(),
    up = (await upload(o.id)).data;
  for (const body of [
    { type: "reupload", proofId: up.proof.id, note: " " },
    { type: "ship", service: "Fake", number: "12345678" },
    { type: "ship", service: "JNE REG", number: "--------" },
  ])
    assert.equal(
      (
        await api(
          "/api/admin/orders/" + o.id + "/actions",
          "POST",
          { ...body, version: up.version },
          admin,
        )
      ).status,
      422,
    );
  const list = await api(
    "/api/admin/orders?status=MENUNGGU_VERIFIKASI&limit=1",
    "GET",
    undefined,
    admin,
  );
  assert.equal(list.total, 1);
  assert.equal(list.counts.MENUNGGU_VERIFIKASI, 1);
  assert.equal((await api("/api/admin/orders?limit=0", "GET", undefined, admin)).status, 422);
  await Product.updateOne(
    { _id: product.id },
    { reservation_order_id: new mongoose.Types.ObjectId() },
  );
  assert.equal((await action(o.id, "approve", up.proof.id)).status, 409);
  const raw = await Order.findById(o.id);
  await fs.unlink(path.join(dir, "proofs", raw.proof.filename));
  const plan = await inspectLegacyData(mongoose.connection, undefined, { uploadDir: dir });
  assert.ok(plan.issues.some((x) => x.code === "PAYMENT_REVIEW_REQUIRED"));
});
test("DB failure rolls proof metadata back and removes newly written file", async () => {
  const o = await place(),
    before = await fs.readdir(path.join(dir, "proofs")).catch(() => []);
  await mongoose.connection.db.command({
    collMod: "orders",
    validator: { forcedFailure: { $exists: true } },
    validationLevel: "strict",
    validationAction: "error",
  });
  try {
    assert.equal((await upload(o.id)).status, 500);
    assert.deepEqual(await fs.readdir(path.join(dir, "proofs")), before);
    assert.equal((await Order.findById(o.id)).status, "MENUNGGU_PEMBAYARAN");
  } finally {
    await mongoose.connection.db.command({
      collMod: "orders",
      validator: {},
      validationLevel: "off",
    });
  }
});

test("cancel versus upload and stale Admin action versus replacement are safe", async () => {
  const o = await place();
  const results = await Promise.all([
    upload(o.id),
    api("/api/orders/" + o.id + "/cancel", "POST", {}),
  ]);
  assert.deepEqual(results.map((x) => x.status).sort(), [200, 409]);
  product = await Product.create(productInput());
  const next = await place();
  const proof = (await upload(next.id)).data.proof;
  await action(next.id, "reupload", proof.id, { note: "Buram" });
  const outcomes = await Promise.all([upload(next.id), action(next.id, "approve", proof.id)]);
  assert.ok(outcomes.some((x) => x.status === 200));
  const stored = await Order.findById(next.id);
  if (stored.status === "DIPROSES") {
    assert.equal(outcomes[0].status, 409);
    assert.equal(stored.proof.id, proof.id);
  } else {
    assert.equal(outcomes[1].status, 409);
    assert.notEqual(stored.proof.id, proof.id);
  }
});
test("expiry during image validation commits cancellation and cleans file", async () => {
  const o = await place(),
    files = require("../services/files"),
    save = files.saveImage;
  files.saveImage = async (...args) => {
    const image = await save(...args);
    const expiresAt = new Date(Date.now() - 1000);
    await Order.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(o.id) },
      { $set: { createdAt: new Date(expiresAt - 21600000), expiresAt } },
    );
    return image;
  };
  const before = await fs.readdir(path.join(dir, "proofs"));
  try {
    assert.equal((await upload(o.id)).status, 409);
  } finally {
    files.saveImage = save;
  }
  assert.equal((await Order.findById(o.id)).status, "DIBATALKAN");
  assert.equal((await Product.findById(product.id)).status, "available");
  assert.deepEqual(await fs.readdir(path.join(dir, "proofs")), before);
});

test("filesystem write failure does not mutate order or leave files", async () => {
  const o = await place(),
    before = await fs.readdir(path.join(dir, "proofs")).catch(() => []),
    write = fs.writeFile;
  fs.writeFile = async () => {
    const error = new Error("QA disk failure");
    error.code = "ENOSPC";
    throw error;
  };
  try {
    assert.equal((await upload(o.id)).status, 500);
  } finally {
    fs.writeFile = write;
  }
  assert.equal((await Order.findById(o.id)).proof, null);
  assert.equal((await Product.findById(product.id)).status, "reserved");
  assert.deepEqual(await fs.readdir(path.join(dir, "proofs")), before);
});

async function restartServer() {
  await new Promise((resolve) => server.close(resolve));
  server = undefined;
  await mongoose.disconnect();
  server = await start({
    mongoUri: mongo.getUri("payments"),
    jwtSecret: secret,
    port: 0,
    nodeEnv: "test",
    uploadDir: dir,
  });
}
const decision = (o, type, version = o.version, extra = {}, who = admin) =>
  api(
    "/api/admin/orders/" + o.id + "/actions",
    "POST",
    { type, version, proofId: o.proof.id, ...extra },
    who,
  );
test("missing proof: JSON error, request replacement, restart, reupload and approve", async () => {
  const o = await place(),
    up = (await upload(o.id)).data,
    raw = await Order.findById(o.id);
  await fs.unlink(path.join(dir, "proofs", raw.proof.filename));
  const missing = await api(up.proof.url);
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get("content-type"), /^application\/json/);
  assert.equal(missing.code, "FILE_UNAVAILABLE");
  assert.equal((await decision(up, "approve")).code, "PROOF_UNAVAILABLE");
  await assert.rejects(assertDataReady(mongoose.connection, { uploadDir: dir }), {
    code: "DATA_MIGRATION_REQUIRED",
  });
  const asked = await decision(up, "reupload", up.version, { note: "File hilang, unggah ulang" });
  assert.equal(asked.status, 200);
  assert.equal(asked.data.proof.unavailable, true);
  assert.equal(asked.data.proof.id, up.proof.id);
  assert.ok(asked.data.version > up.version);
  await assertDataReady(mongoose.connection, { uploadDir: dir });
  await restartServer();
  assert.equal((await decision(asked.data, "approve")).code, "PROOF_UNAVAILABLE");
  const replacement = await upload(o.id);
  assert.equal(replacement.status, 200);
  assert.equal(replacement.data.proof.unavailable, false);
  assert.notEqual(replacement.data.proof.id, up.proof.id);
  assert.equal((await decision(replacement.data, "approve")).status, 200);
  assert.equal((await Product.findById(product.id)).status, "sold");
  await restartServer();
  assert.equal((await api("/api/orders/" + o.id)).data.status, "DIPROSES");
});
test("missing proof reject releases stock and remains valid after restart", async () => {
  const o = await place(),
    up = (await upload(o.id)).data,
    raw = await Order.findById(o.id);
  await fs.unlink(path.join(dir, "proofs", raw.proof.filename));
  const rejected = await decision(up, "reject", up.version, {
    note: "Pembayaran ditolak setelah pemeriksaan",
  });
  assert.equal(rejected.status, 200);
  assert.equal(rejected.data.proof.unavailable, true);
  assert.equal(rejected.data.cancellation_reason, "admin");
  assert.equal((await Product.findById(product.id)).status, "available");
  await restartServer();
  const next = await place();
  await api("/api/orders/" + o.id + "/cancel", "POST", {});
  assert.equal(String((await Product.findById(product.id)).reservation_order_id), next.id);
});
test("recovery markers cannot hide missing proof on unhandled/approved orders", async () => {
  const o = await place(),
    up = (await upload(o.id)).data;
  await Order.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(o.id) },
    { $set: { "proof.unavailable": true } },
  );
  const plan = await inspectLegacyData(mongoose.connection, undefined, { uploadDir: dir });
  assert.ok(plan.issues.some((x) => x.fields.includes("proof.unavailable")));
  await assert.rejects(migrateLegacyData(mongoose.connection, true, { uploadDir: dir }), {
    code: "DATA_MIGRATION_REQUIRED",
  });
  assert.equal(
    (
      await api(
        "/api/admin/orders/" + o.id + "/actions",
        "POST",
        {
          type: "reupload",
          proofId: up.proof.id,
          version: up.version,
          note: "x",
          unavailable: true,
        },
        admin,
      )
    ).status,
    422,
  );
});
test("two Admins decide against same version: exactly one succeeds, refresh allows next action", async () => {
  const second = await User.create({
    name: "Second Admin",
    email: "admin2@example.test",
    password: "fixture",
    role: "admin",
  });
  const who = jwt.sign({ id: second.id }, secret);
  for (const type of ["approve", "reject"]) {
    for (let i = 0; i < 3; i++) {
      product = await Product.create(productInput());
      const o = await place(),
        up = (await upload(o.id)).data;
      const results = await Promise.all([
        decision(up, "reupload", up.version, { note: "Bukti buram" }),
        decision(up, type, up.version, type === "reject" ? { note: "Ditolak" } : {}, who),
      ]);
      assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
      assert.equal(results.find((r) => r.status === 409).code, "STALE_ORDER");
    }
  }
  product = await Product.create(productInput());
  const o = await place(),
    up = (await upload(o.id)).data;
  const asked = await decision(up, "reupload", up.version, { note: "Bukti buram" });
  assert.equal(asked.status, 200);
  assert.equal((await decision(up, "approve")).code, "STALE_ORDER");
  const fresh = (await api("/api/orders/" + o.id)).data;
  assert.equal((await decision(fresh, "approve")).status, 200);
});
test("Admin action requires integer version; stale ship cannot overwrite order", async () => {
  const o = await place(),
    up = (await upload(o.id)).data;
  for (const version of [undefined, null, -1, 0.5, "1", 9007199254740992])
    assert.equal(
      (await decision(up, "approve", version === undefined ? null : version)).status,
      422,
    );
  const noVersion = await api(
    "/api/admin/orders/" + o.id + "/actions",
    "POST",
    { type: "approve", proofId: up.proof.id },
    admin,
  );
  assert.equal(noVersion.status, 422);
  const approved = await decision(up, "approve");
  assert.equal(approved.status, 200);
  const body = { type: "ship", service: "JNE REG", number: "JNE12345678", version: up.version };
  assert.equal(
    (await api("/api/admin/orders/" + o.id + "/actions", "POST", body, admin)).code,
    "STALE_ORDER",
  );
  body.version = approved.data.version;
  assert.equal(
    (await api("/api/admin/orders/" + o.id + "/actions", "POST", body, admin)).status,
    200,
  );
});
test("file stream failure after headers closes request instead of hanging", async () => {
  const o = await place();
  const up = (await upload(o.id)).data;
  const response = require("express").response,
    send = response.sendFile;
  response.sendFile = function (target, cb) {
    this.write("partial");
    cb(new Error("QA stream failure"));
    return this;
  };
  try {
    await assert.rejects(
      async () => {
        const r = await fetch("http://127.0.0.1:" + server.address().port + up.proof.url, {
          headers: { Authorization: "Bearer " + token },
          signal: AbortSignal.timeout(3000),
        });
        await r.arrayBuffer();
      },
      (error) => error.name !== "TimeoutError",
    );
  } finally {
    response.sendFile = send;
  }
});

test("legacy version default is explicit and malformed versions block migration", async () => {
  const o = await place(),
    id = new mongoose.Types.ObjectId(o.id);
  await Order.collection.updateOne({ _id: id }, { $unset: { __v: "" } });
  const before = await Order.collection.findOne({ _id: id });
  const plan = await inspectLegacyData(mongoose.connection, undefined, { uploadDir: dir });
  assert.equal(plan.orders.find((x) => String(x.id) === o.id).set.__v, 0);
  assert.deepEqual(await Order.collection.findOne({ _id: id }), before);
  await assert.rejects(assertDataReady(mongoose.connection, { uploadDir: dir }), {
    code: "DATA_MIGRATION_REQUIRED",
  });
  await migrateLegacyData(mongoose.connection, true, { uploadDir: dir });
  assert.equal((await Order.collection.findOne({ _id: id })).__v, 0);
  await assertDataReady(mongoose.connection, { uploadDir: dir });
  for (const value of [-1, 0.5, "1"]) {
    await Order.collection.updateOne({ _id: id }, { $set: { __v: value } });
    const bad = await Order.collection.findOne({ _id: id });
    const result = await inspectLegacyData(mongoose.connection, undefined, { uploadDir: dir });
    assert.ok(result.issues.some((x) => x.code === "ORDER_VERSION_REVIEW_REQUIRED"));
    await assert.rejects(migrateLegacyData(mongoose.connection, true, { uploadDir: dir }), {
      code: "DATA_MIGRATION_REQUIRED",
    });
    assert.deepEqual(await Order.collection.findOne({ _id: id }), bad);
  }
});
