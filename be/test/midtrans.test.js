const { before, beforeEach, after, test, mock } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes, randomUUID } = require("node:crypto");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const { start } = require("../webthrift");
const { getConfig } = require("../config");
const User = require("../models/user");
const Product = require("../models/products");
const Order = require("../models/order");
const { expireOrders, cancelOrder } = require("../services/orders");
const { assertDataReady, inspectLegacyData } = require("../lib/legacy-data");
const { uploadProof, adminAction } = require("../services/payments");
const { productInput, addressInput } = require("./fixtures");

const secret = randomBytes(48).toString("hex");
const serverKey = "SB-Mid-server-" + randomBytes(24).toString("hex");
const realFetch = globalThis.fetch;
let mongo, server, config, buyer, other, admin, product, token, otherToken, adminToken;
let calls, provider;
const successResponse = () => {
  const token = randomUUID();
  return new globalThis.Response(
    JSON.stringify({
      token,
      redirect_url: `https://app.sandbox.midtrans.com/snap/v4/redirection/${token}`,
    }),
    { status: 201, headers: { "Content-Type": "application/json" } },
  );
};
async function request(route, { method = "GET", body, who = token } = {}) {
  const res = await fetch(`http://127.0.0.1:${server.address().port}/api${route}`, {
    method,
    headers: {
      ...(who ? { Authorization: `Bearer ${who}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  assert.equal(data.success, res.ok);
  return { ...data, status: res.status, headers: res.headers };
}
const place = () => request("/orders", { method: "POST", body: { product_id: product.id } });
const pay = (id, options = {}) =>
  request(`/orders/${id}/payment`, { method: "POST", body: {}, ...options });
const cancel = (id) => request(`/orders/${id}/cancel`, { method: "POST", body: {} });

before(async () => {
  mock.method(globalThis, "fetch", async (url, init) => {
    if (typeof url === "string" && url.startsWith("https://api.sandbox.midtrans.com/"))
      return new globalThis.Response("{}", { status: 503 });
    if (url !== "https://app.sandbox.midtrans.com/snap/v1/transactions")
      return realFetch(url, init);
    calls.push({ url, init, body: JSON.parse(init.body) });
    return provider();
  });
  mongo = await MongoMemoryReplSet.create({ binary: { version: "8.2.6" }, replSet: { count: 1 } });
  config = getConfig({
    MONGODB_URI: mongo.getUri("midtrans_qa"),
    JWT_SECRET: secret,
    PORT: "0",
    NODE_ENV: "test",
    MIDTRANS_ENABLED: "true",
    MIDTRANS_SERVER_KEY: serverKey,
    FRONTEND_URL: "http://localhost:3000",
  });
  server = await start(config);
});
beforeEach(async () => {
  for (const collection of ["users", "products", "orders", "wishlists", "reviews"])
    await mongoose.connection.db.collection(collection).deleteMany({});
  [buyer, other, admin] = await User.create([
    { name: "Buyer QA", email: "buyer@example.test", password: "fixture", address: addressInput() },
    { name: "Other QA", email: "other@example.test", password: "fixture", address: addressInput() },
    { name: "Admin QA", email: "admin@example.test", password: "fixture", role: "admin" },
  ]);
  [token, otherToken, adminToken] = [buyer, other, admin].map((x) =>
    jwt.sign({ id: x.id }, secret),
  );
  product = await Product.create(productInput());
  config.midtrans.enabled = true;
  calls = [];
  provider = successResponse;
});
after(async () => {
  mock.restoreAll();
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test("config: opt-in, secret sandbox dan origin FE wajib; production key ditolak", () => {
  const base = { MONGODB_URI: "mongodb://unused", JWT_SECRET: secret };
  assert.deepEqual(getConfig(base).midtrans, { enabled: false });
  assert.throws(() => getConfig({ ...base, MIDTRANS_ENABLED: "yes" }), /MIDTRANS_ENABLED/);
  const on = { ...base, MIDTRANS_ENABLED: "true" };
  assert.throws(() => getConfig(on), /MIDTRANS_SERVER_KEY/);
  assert.throws(
    () => getConfig({ ...on, MIDTRANS_SERVER_KEY: "Mid-server-live" }),
    /MIDTRANS_SERVER_KEY/,
  );
  for (const url of [
    undefined,
    "bad",
    "http://example.test",
    "https://user:pass@example.test",
    "https://example.test/path",
    "https://example.test?next=evil",
  ])
    assert.throws(
      () => getConfig({ ...on, MIDTRANS_SERVER_KEY: serverKey, FRONTEND_URL: url }),
      /FRONTEND_URL/,
    );
  assert.equal(
    getConfig({
      ...on,
      MIDTRANS_SERVER_KEY: serverKey,
      FRONTEND_URL: "https://picka.example.test/",
    }).midtrans.frontendUrl,
    "https://picka.example.test",
  );
});

test("config: key notifikasi terpisah dan override webhook harus HTTPS tanpa kredensial", () => {
  const base = {
    MONGODB_URI: "mongodb://unused",
    JWT_SECRET: secret,
    MIDTRANS_ENABLED: "true",
    MIDTRANS_SERVER_KEY: serverKey,
    FRONTEND_URL: "http://localhost:3000",
  };
  assert.equal(getConfig(base).midtrans.notificationKey, serverKey);
  const notificationKey = "SB-Mid-server-" + randomBytes(24).toString("hex");
  assert.equal(
    getConfig({ ...base, MIDTRANS_NOTIFICATION_KEY: notificationKey }).midtrans.notificationKey,
    notificationKey,
  );
  const primaryKey = notificationKey.replace(/^SB-/, "");
  assert.equal(
    getConfig({ ...base, MIDTRANS_NOTIFICATION_KEY: primaryKey }).midtrans.notificationKey,
    primaryKey,
  );
  assert.throws(
    () => getConfig({ ...base, MIDTRANS_NOTIFICATION_KEY: "SB-Mid-client-wrong" }),
    /MIDTRANS_NOTIFICATION_KEY/,
  );
  for (const url of [
    "bad",
    "http://example.test/hook",
    "https://user:pass@example.test/hook",
    "https://example.test/#token",
    "https://one.test,https://two.test",
  ])
    assert.throws(
      () => getConfig({ ...base, MIDTRANS_NOTIFICATION_URL: url }),
      /MIDTRANS_NOTIFICATION_URL/,
    );
  assert.equal(
    getConfig({
      ...base,
      MIDTRANS_NOTIFICATION_URL: "https://example.test/api/payments/midtrans/notification",
    }).midtrans.notificationUrl,
    "https://example.test/api/payments/midtrans/notification",
  );
});

test("override webhook diteruskan hanya pada request Snap dari konfigurasi BE", async () => {
  config.midtrans.notificationUrl = "https://example.test/api/payments/midtrans/notification";
  try {
    const order = (await place()).data;
    assert.equal((await pay(order.id)).status, 201);
    assert.equal(calls[0].init.headers["X-Override-Notification"], config.midtrans.notificationUrl);
    assert.ok(!JSON.stringify(order).includes("notificationUrl"));
  } finally {
    delete config.midtrans.notificationUrl;
  }
});

test("checkout gateway: metadata tersimpan, harga server, VA/QRIS, expiry dan URL kembali", async () => {
  const order = (await place()).data;
  await User.updateOne(
    { _id: buyer.id },
    { address: { ...addressInput(), street: "Alamat baru setelah checkout" } },
  );
  assert.equal(order.payment.provider, "midtrans");
  assert.equal(order.payment.status, "not_started");
  const paid = await pay(order.id);
  assert.equal(paid.status, 201);
  assert.equal(paid.headers.get("cache-control"), "no-store");
  assert.equal(calls.length, 1);
  const { body, init } = calls[0];
  const stored = await Order.findById(order.id);
  assert.deepEqual(body.transaction_details, {
    order_id: `picka-${order.id}`,
    gross_amount: product.price + 15000,
  });
  assert.deepEqual(body.enabled_payments, [
    "bca_va",
    "bni_va",
    "bri_va",
    "permata_va",
    "echannel",
    "other_qris",
  ]);
  assert.equal(
    body.item_details.reduce((sum, item) => sum + item.price * item.quantity, 0),
    stored.total_price,
  );
  assert.equal(body.customer_details.shipping_address.address, addressInput().street);
  assert.equal(body.expiry.duration, 360);
  assert.ok(Math.abs(new Date(body.expiry.start_time) - stored.createdAt) < 1000);
  assert.ok(body.page_expiry.duration <= 359);
  assert.ok(stored.payment.sessionExpiresAt <= stored.expiresAt);
  assert.equal(body.callbacks.finish, `http://localhost:3000/pesanan/${order.id}`);
  assert.equal(
    init.headers.Authorization,
    `Basic ${Buffer.from(serverKey + ":").toString("base64")}`,
  );
  assert.equal(init.redirect, "error");
  assert.ok(init.signal);
  assert.equal(stored.status, "MENUNGGU_PEMBAYARAN");
  assert.equal((await Product.findById(product.id)).status, "reserved");
  await assertDataReady(mongoose.connection);
});

test("sesi digunakan ulang dari DB, termasuk setelah server dimulai ulang; DTO tidak membocorkan token/URL", async () => {
  const order = (await place()).data;
  const first = await pay(order.id);
  await new Promise((resolve) => server.close(resolve));
  server = await start(config);
  const repeat = await pay(order.id);
  assert.equal(repeat.status, 200);
  assert.deepEqual(repeat.data, first.data);
  assert.equal(calls.length, 1);
  const stored = await Order.findById(order.id);
  for (const route of [`/orders/${order.id}`, "/orders/my", "/admin/orders"]) {
    const read = await request(route, { who: route.startsWith("/admin") ? adminToken : token });
    assert.equal(read.status, 200);
    const json = JSON.stringify(read.data);
    assert.ok(!json.includes(stored.payment.snapToken));
    assert.ok(!json.includes("redirectUrl"));
    assert.ok(!json.includes(serverKey));
  }
});

test("dua request bersamaan hanya satu request provider, pihak kedua dapat melanjutkan sesi sama", async () => {
  const order = (await place()).data;
  let notify, finish;
  const started = new Promise((resolve) => {
    notify = resolve;
  });
  const wait = new Promise((resolve) => {
    finish = resolve;
  });
  provider = async () => {
    notify();
    await wait;
    return successResponse();
  };
  const first = pay(order.id);
  await started;
  try {
    const second = await pay(order.id);
    assert.equal(second.status, 409);
    assert.equal(second.code, "PAYMENT_IN_PROGRESS");
    assert.equal(calls.length, 1);
    assert.equal((await cancel(order.id)).code, "PAYMENT_IN_PROGRESS");
  } finally {
    finish();
  }
  assert.equal((await first).status, 201);
  assert.equal((await pay(order.id)).status, 200);
  assert.equal(calls.length, 1);
});

test("akses, input, metode lama dan fitur nonaktif ditolak sebelum request provider", async () => {
  const order = (await place()).data;
  for (const [options, status] of [
    [{ who: null }, 401],
    [{ who: otherToken }, 403],
    [{ who: adminToken }, 403],
    [{ body: { gross_amount: 1 } }, 422],
  ])
    assert.equal((await pay(order.id, options)).status, status);
  assert.equal((await pay("bad")).status, 422);
  assert.equal((await pay(new mongoose.Types.ObjectId().toString())).status, 404);
  config.midtrans.enabled = false;
  assert.equal((await pay(order.id)).code, "PAYMENT_UNAVAILABLE");
  await cancel(order.id);
  assert.equal((await place()).code, "PAYMENT_UNAVAILABLE");
  const gateway = config.midtrans;
  delete config.midtrans; // Fixture deployment lama, sebelum gateway; tidak melalui getConfig produksi.
  const manual = (await place()).data;
  assert.equal(manual.payment.provider, "manual");
  config.midtrans = gateway;
  config.midtrans.enabled = true;
  assert.equal((await pay(manual.id)).code, "PAYMENT_METHOD_CONFLICT");
  assert.equal(calls.length, 0);
});

for (const [label, handler] of [
  [
    "timeout",
    () => {
      throw new Error("Timeout " + serverKey);
    },
  ],
  [
    "HTTP 401",
    () => new globalThis.Response(JSON.stringify({ error: serverKey }), { status: 401 }),
  ],
  ["HTTP 500", () => new globalThis.Response("provider error " + serverKey, { status: 500 })],
  ["JSON rusak", () => new globalThis.Response("not json", { status: 201 })],
  ["respons kosong", () => new globalThis.Response("null", { status: 201 })],
  [
    "token dan URL berbeda",
    () =>
      new globalThis.Response(
        JSON.stringify({
          token: randomUUID(),
          redirect_url: `https://app.sandbox.midtrans.com/snap/v4/redirection/${randomUUID()}`,
        }),
        { status: 201 },
      ),
  ],
  [
    "URL asing",
    () =>
      new globalThis.Response(
        JSON.stringify({ token: randomUUID(), redirect_url: "https://evil.example.test" }),
        { status: 201 },
      ),
  ],
]) {
  test(`${label}: unknown, tidak retry otomatis, rahasia tidak bocor dan stok tetap terkunci`, async () => {
    const order = (await place()).data;
    provider = handler;
    const result = await pay(order.id);
    assert.equal(result.status, 503);
    assert.equal(result.code, "PAYMENT_STATUS_UNKNOWN");
    assert.ok(!JSON.stringify(result).includes(serverKey));
    assert.equal((await Order.findById(order.id)).payment.status, "unknown");
    assert.equal((await pay(order.id)).code, "PAYMENT_STATUS_UNKNOWN");
    assert.equal(calls.length, 1);
    assert.equal((await cancel(order.id)).code, "PAYMENT_STATUS_UNKNOWN");
    const expiresAt = new Date(Date.now() - 1000);
    await Order.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(order.id) },
      {
        $set: {
          expiresAt,
          createdAt: new Date(expiresAt - 21600000),
          "payment.requestedAt": new Date(expiresAt - 120000),
          "payment.sessionExpiresAt": new Date(expiresAt - 60000),
        },
      },
    );
    await expireOrders();
    assert.equal((await Order.findById(order.id)).status, "MENUNGGU_PEMBAYARAN");
    assert.equal((await Product.findById(product.id)).status, "reserved");
    await assertDataReady(mongoose.connection);
  });
}

test("respons provider sukses tetapi DB gagal tidak mengembalikan URL atau membuat sesi tambahan", async () => {
  const order = (await place()).data;
  provider = async () => {
    await mongoose.connection.db.command({
      collMod: "orders",
      validator: { forcedFailure: { $exists: true } },
      validationLevel: "strict",
      validationAction: "error",
    });
    return successResponse();
  };
  try {
    const result = await pay(order.id);
    assert.equal(result.code, "PAYMENT_STATUS_UNKNOWN");
    assert.ok(!JSON.stringify(result).includes("redirectUrl"));
    assert.equal((await pay(order.id)).code, "PAYMENT_IN_PROGRESS");
    assert.equal(calls.length, 1);
  } finally {
    await mongoose.connection.db.command({
      collMod: "orders",
      validator: {},
      validationLevel: "off",
    });
  }
});

test("creating dari proses terhenti berubah unknown tanpa request kedua", async () => {
  const order = (await place()).data;
  const requestedAt = new Date(Date.now() - 30000);
  await Order.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(order.id) },
    {
      $set: {
        createdAt: requestedAt,
        expiresAt: new Date(requestedAt.getTime() + 21600000),
        "payment.status": "creating",
        "payment.requestedAt": requestedAt,
        "payment.sessionExpiresAt": new Date(requestedAt.getTime() + 21540000),
      },
    },
  );
  assert.equal((await pay(order.id)).code, "PAYMENT_STATUS_UNKNOWN");
  assert.equal((await Order.findById(order.id)).payment.status, "unknown");
  assert.equal(calls.length, 0);
  await assertDataReady(mongoose.connection);
});

test("belum memulai sesi: batal/kedaluwarsa aman dan tidak bisa dibayar lagi", async () => {
  const order = (await place()).data;
  assert.equal((await cancel(order.id)).status, 200);
  assert.equal((await pay(order.id)).code, "INVALID_TRANSITION");
  const next = (await place()).data;
  const expiresAt = new Date(Date.now() - 1000);
  await Order.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(next.id) },
    {
      $set: { expiresAt, createdAt: new Date(expiresAt - 21600000) },
    },
  );
  assert.equal((await pay(next.id)).code, "PAYMENT_EXPIRED");
  await expireOrders();
  assert.equal((await Product.findById(product.id)).status, "available");
  assert.equal(calls.length, 0);
  await assertDataReady(mongoose.connection);
});

test("deadline tidak diperpanjang: tidak memulai dekat deadline dan tidak mengganti sesi berakhir", async () => {
  const order = (await place()).data;
  const expiresAt = new Date(Date.now() + 300000);
  await Order.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(order.id) },
    {
      $set: { expiresAt, createdAt: new Date(expiresAt - 21600000) },
    },
  );
  assert.equal((await pay(order.id)).code, "PAYMENT_WINDOW_TOO_SHORT");
  assert.equal(calls.length, 0);
  const createdAt = new Date(Date.now() - 120000);
  await Order.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(order.id) },
    {
      $set: { createdAt, expiresAt: new Date(createdAt.getTime() + 21600000) },
    },
  );
  assert.equal((await pay(order.id)).status, 201);
  await Order.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(order.id) },
    {
      $set: {
        "payment.requestedAt": createdAt,
        "payment.sessionExpiresAt": new Date(Date.now() - 1000),
      },
    },
  );
  assert.equal((await pay(order.id)).code, "PAYMENT_SESSION_EXPIRED");
  assert.equal(calls.length, 1);
});

test("kunci stok milik order lain: tidak membuat sesi dan tidak melepas kuncinya", async () => {
  const order = (await place()).data;
  const different = new mongoose.Types.ObjectId();
  await Product.updateOne({ _id: product.id }, { reservation_order_id: different });
  assert.equal((await pay(order.id)).code, "STOCK_CONFLICT");
  await cancelOrder(order.id, buyer.id);
  assert.equal(
    String((await Product.findById(product.id)).reservation_order_id),
    String(different),
  );
  assert.equal(calls.length, 0);
});

test("jalur bukti dan keputusan manual ditolak untuk gateway", async () => {
  const order = (await place()).data;
  const upload = await request(`/orders/${order.id}/payment-proof`, { method: "POST" });
  assert.equal(upload.code, "PAYMENT_METHOD_CONFLICT");
  await assert.rejects(uploadProof(order.id, buyer, {}, ""), { code: "PAYMENT_METHOD_CONFLICT" });
  await assert.rejects(
    adminAction(order.id, {
      type: "approve",
      proofId: new mongoose.Types.ObjectId().toString(),
      version: order.version,
    }),
    { code: "PAYMENT_METHOD_CONFLICT" },
  );
});

test("guard startup: order manual tidak ditulis ulang, metadata rusak menjadi blocker dan ID unik", async () => {
  const gateway = config.midtrans;
  delete config.midtrans;
  const manual = (await place()).data;
  await Order.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(manual.id) },
    { $unset: { payment: "" } },
  );
  const preview = await inspectLegacyData(mongoose.connection);
  assert.equal(preview.orders.length, 0);
  assert.equal(preview.issues.length, 0);
  assert.equal((await request(`/orders/${manual.id}`)).data.payment.provider, "manual");
  await cancel(manual.id);
  config.midtrans = gateway;
  const next = (await place()).data;
  await Order.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(next.id) },
    {
      $set: {
        "payment.provider": "other",
        "payment.status": "ready",
        "payment.redirectUrl": "https://evil.test",
      },
    },
  );
  const invalid = await inspectLegacyData(mongoose.connection);
  assert.ok(invalid.issues.some((issue) => issue.code === "GATEWAY_REVIEW_REQUIRED"));
  await assert.rejects(assertDataReady(mongoose.connection), { code: "DATA_MIGRATION_REQUIRED" });
  const stored = await Order.findById(next.id);
  // Unique index menolak ID yang sama; dry-run juga mendeteksi ketidaksesuaian ID order.
  await assert.rejects(
    Order.collection.insertOne({ ...stored.toObject(), _id: new mongoose.Types.ObjectId() }),
    { code: 11000 },
  );
});

test("pembuatan sesi bersamaan dengan pembatalan tidak meninggalkan sesi aktif pada order batal", async () => {
  for (let attempt = 0; attempt < 6; attempt++) {
    product = await Product.create(productInput({ name: `Race ${attempt}` }));
    const order = (await place()).data;
    const countBefore = calls.length;
    const [payment, cancellation] = await Promise.all([pay(order.id), cancel(order.id)]);
    const saved = await Order.findById(order.id);
    const stock = await Product.findById(product.id);
    if (cancellation.status === 200) {
      assert.equal(payment.status, 409);
      assert.equal(calls.length, countBefore);
      assert.equal(saved.payment.status, "not_started");
      assert.equal(saved.status, "DIBATALKAN");
      assert.equal(stock.status, "available");
    } else {
      assert.equal(cancellation.code, "PAYMENT_IN_PROGRESS");
      assert.equal(payment.status, 201);
      assert.equal(calls.length, countBefore + 1);
      assert.equal(saved.status, "MENUNGGU_PEMBAYARAN");
      assert.equal(stock.status, "reserved");
    }
  }
});
