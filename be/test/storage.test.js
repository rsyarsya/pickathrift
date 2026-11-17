const { before, beforeEach, after, test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { once } = require("node:events");
const { randomBytes } = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const sharp = require("sharp");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const { start } = require("../webthrift");
const { getStorageConfig } = require("../config");
const files = require("../services/files");
const User = require("../models/user");
const Product = require("../models/products");
const Order = require("../models/order");
const { productInput, addressInput } = require("./fixtures");
const { FormData, Blob, URL } = globalThis;

const secret = randomBytes(48).toString("hex");
let mongo, remote, server, config, temp, png, buyer, other, admin;
const objects = new Map();
let publicBucket = false,
  readFailure = false,
  failUploadAt = 0,
  uploads = 0;

async function api(route, { token, method = "GET", body } = {}) {
  const form = body instanceof FormData;
  const r = await fetch(`http://127.0.0.1:${server.address().port}${route}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(!form && body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: form ? body : body === undefined ? undefined : JSON.stringify(body),
  });
  if (r.headers.get("content-type")?.startsWith("image/"))
    return { status: r.status, buffer: Buffer.from(await r.arrayBuffer()), headers: r.headers };
  return { status: r.status, body: await r.json() };
}
function form(field = "images", count = 1, buffer = png) {
  const result = new FormData();
  for (let i = 0; i < count; i++)
    result.append(field, new Blob([buffer], { type: "image/png" }), "qa.png");
  return result;
}
const upload = (options = {}) =>
  api("/api/admin/product-images", { method: "POST", token: admin, body: form(), ...options });

before(async () => {
  // Real Supabase SDK against an isolated HTTP fixture, no credentials or network cloud dependency.
  remote = http
    .createServer(async (req, res) => {
      const body = [];
      for await (const chunk of req) body.push(chunk);
      const raw = Buffer.concat(body);
      const json = (status, value) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(value));
      };
      if (req.headers.apikey !== "sb_secret_qa") return json(401, { message: "unauthorized" });
      const route = new URL(req.url, "http://fixture").pathname.replace("/storage/v1", "");
      if (route === "/bucket/assets")
        return json(200, { id: "assets", name: "assets", public: publicBucket });
      const match = route.match(/^\/object\/(?:authenticated\/)?assets\/(.+)$/);
      if (match) {
        const key = decodeURIComponent(match[1]);
        if (req.method === "POST") {
          if (++uploads === failUploadAt)
            return json(500, { message: "fixture upload unavailable" });
          if (objects.has(key)) return json(409, { message: "already exists" });
          objects.set(key, raw);
          return json(200, { Key: "assets/" + key });
        }
        if (readFailure) return json(503, { message: "fixture download unavailable" });
        if (!objects.has(key)) return json(404, { statusCode: "404", message: "Object not found" });
        res.writeHead(200, { "Content-Type": "image/png" });
        return res.end(objects.get(key));
      }
      if (route === "/object/assets" && req.method === "DELETE") {
        for (const prefix of JSON.parse(raw.toString()).prefixes) objects.delete(prefix);
        return json(200, []);
      }
      return json(404, { message: "unknown fixture route" });
    })
    .listen(0, "127.0.0.1");
  await once(remote, "listening");
  temp = await fs.mkdtemp(path.join(os.tmpdir(), "pickathrift-storage-"));
  mongo = await MongoMemoryReplSet.create({ binary: { version: "8.2.6" }, replSet: { count: 1 } });
  config = {
    mongoUri: mongo.getUri("storage"),
    jwtSecret: secret,
    port: 0,
    nodeEnv: "test",
    uploadDir: path.join(temp, "must-not-create"),
    storage: {
      provider: "supabase",
      url: `http://127.0.0.1:${remote.address().port}`,
      secretKey: "sb_secret_qa",
      bucket: "assets",
    },
  };
  server = await start(config);
  png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "red" } })
    .png()
    .toBuffer();
});
beforeEach(async () => {
  objects.clear();
  publicBucket = false;
  readFailure = false;
  failUploadAt = 0;
  uploads = 0;
  await Promise.all([User.deleteMany({}), Product.deleteMany({}), Order.deleteMany({})]);
  const users = await User.create(
    ["buyer", "other", "admin"].map((name) => ({
      name,
      email: name + "@storage.test",
      password: "fixture",
      address: addressInput(),
      role: name === "admin" ? "admin" : "buyer",
    })),
  );
  [buyer, other, admin] = users.map((user) => jwt.sign({ id: user.id }, secret));
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  if (remote) await new Promise((resolve) => remote.close(resolve));
  if (temp) {
    assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temp).startsWith("pickathrift-storage-"));
    await fs.rm(temp, { recursive: true, force: true });
  }
});

test("driver is explicit; incomplete or unsafe cloud config is rejected", () => {
  assert.deepEqual(getStorageConfig({}), { provider: "local" });
  const env = {
    STORAGE_DRIVER: "supabase",
    SUPABASE_URL: "https://qa.supabase.co",
    SUPABASE_SECRET_KEY: "sb_secret_qa",
    SUPABASE_STORAGE_BUCKET: "assets",
  };
  assert.equal(getStorageConfig(env).provider, "supabase");
  for (const patch of [
    { STORAGE_DRIVER: "other" },
    { SUPABASE_URL: "http://qa.supabase.co" },
    { SUPABASE_URL: "https://qa.supabase.co/path" },
    { SUPABASE_URL: "https://user:password@qa.supabase.co" },
    { SUPABASE_SECRET_KEY: "sb_publishable_qa" },
    { SUPABASE_STORAGE_BUCKET: "" },
  ])
    assert.throws(() => getStorageConfig({ ...env, ...patch }));
});
test("public bucket is refused by startup storage check", async () => {
  publicBucket = true;
  await assert.rejects(() => files.assertStorageReady(config), {
    status: 503,
    code: "STORAGE_UNAVAILABLE",
  });
});
test("Admin upload keeps public URL and remains readable after BE restart without local disk", async () => {
  const result = await upload();
  assert.equal(result.status, 201);
  const url = result.body.data[0];
  assert.match(url, /^\/uploads\/products\/[\w-]+\.png$/);
  assert.equal(objects.size, 1);
  assert.equal((await api(url)).status, 200);
  await new Promise((resolve) => server.close(resolve));
  server = await start(config);
  const read = await api(url);
  assert.equal(read.status, 200);
  assert.deepEqual(read.buffer, png);
  assert.equal(read.headers.get("x-content-type-options"), "nosniff");
  await assert.rejects(fs.stat(config.uploadDir), { code: "ENOENT" });
});
test("only Admin may upload photos", async () => {
  assert.equal((await upload({ token: undefined })).status, 401);
  assert.equal((await upload({ token: buyer })).status, 403);
  assert.equal(objects.size, 0);
});
test("corrupt and oversized images are rejected before cloud writes", async () => {
  for (const buffer of [Buffer.from("invalid"), Buffer.alloc(2097153)])
    assert.equal((await upload({ body: form("images", 1, buffer) })).status, 422);
  assert.equal(objects.size, 0);
});
test("partial multi-photo upload is cleaned up and provider errors do not leak secrets", async () => {
  failUploadAt = 2;
  const result = await upload({ body: form("images", 3) });
  assert.equal(result.status, 503);
  assert.equal(result.body.code, "STORAGE_UNAVAILABLE");
  assert.ok(!JSON.stringify(result.body).includes(config.storage.secretKey));
  assert.equal(objects.size, 0);
  await assert.rejects(fs.stat(config.uploadDir), { code: "ENOENT" });
});
test("missing image is 404; provider outage is 503 without local fallback", async () => {
  const result = await upload();
  const url = result.body.data[0];
  readFailure = true;
  assert.equal((await api(url)).status, 503);
  await assert.rejects(() => files.proofAvailable(config, "qa.png"), { status: 503 });
  readFailure = false;
  assert.equal((await api("/uploads/products/missing.png")).status, 404);
  assert.equal(await files.proofAvailable(config, "missing.png"), false);
});
test("public image route cannot read proofs, traversal or arbitrary object names", async () => {
  objects.set("proofs/secret.png", png);
  for (const url of [
    "/uploads/proofs/secret.png",
    "/uploads/products/..%2Fproofs%2Fsecret.png",
    "/uploads/products/.secret.png",
    "/uploads/products/secret.svg",
  ])
    assert.equal((await api(url)).status, 404);
});
test("manual proof stays private to owner/Admin when backed by cloud", async () => {
  const product = await Product.create(productInput());
  const order = await api("/api/orders", {
    method: "POST",
    token: buyer,
    body: { product_id: product.id },
  });
  assert.equal(order.status, 201);
  const url = `/api/orders/${order.body.data.id}/payment-proof`;
  const up = await api(url, { method: "POST", token: buyer, body: form("file") });
  assert.equal(up.status, 200);
  assert.equal(up.body.data.status, "MENUNGGU_VERIFIKASI");
  assert.equal((await api(url)).status, 401);
  assert.equal((await api(url, { token: other })).status, 403);
  for (const token of [buyer, admin]) {
    const read = await api(url, { token });
    assert.equal(read.status, 200);
    assert.deepEqual(read.buffer, png);
    assert.equal(read.headers.get("cache-control"), "private, no-store");
  }
  const key = [...objects.keys()].find((key) => key.startsWith("proofs/"));
  assert.equal(await files.proofAvailable(config, key.slice(7)), true);
});
test("failed order update removes newly uploaded cloud proof", async (t) => {
  const product = await Product.create(productInput());
  const order = await api("/api/orders", {
    method: "POST",
    token: buyer,
    body: { product_id: product.id },
  });
  t.mock.method(require("../services/payments"), "uploadProof", async () => {
    throw new (require("../lib/errors").ApiError)(409, "STALE_ORDER", "Pesanan berubah.");
  });
  const up = await api(`/api/orders/${order.body.data.id}/payment-proof`, {
    method: "POST",
    token: buyer,
    body: form("file"),
  });
  assert.equal(up.status, 409);
  assert.equal(objects.size, 0);
});
test("cloud removal deletes object and repeated removal is harmless", async () => {
  const up = await upload();
  const name = up.body.data[0].split("/").pop();
  await files.removeImage(config, "products", name);
  await files.removeImage(config, "products", name);
  assert.equal(objects.size, 0);
  assert.equal((await api(up.body.data[0])).status, 404);
});
