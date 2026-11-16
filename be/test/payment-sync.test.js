const { before, beforeEach, after, test, mock } = require("node:test");
const assert = require("node:assert/strict");
const { createHash, randomBytes, randomUUID } = require("node:crypto");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const { start } = require("../webthrift");
const { getConfig } = require("../config");
const Order = require("../models/order");
const User = require("../models/user");
const Product = require("../models/products");
const { assertDataReady } = require("../lib/legacy-data");
const { expireOrders } = require("../services/orders");
const { productInput, addressInput } = require("./fixtures");

const secret = randomBytes(48).toString("hex");
const serverKey = "SB-Mid-server-" + randomBytes(24).toString("hex");
const realFetch = globalThis.fetch;
let server, mongo, config, buyer, other, admin, token, otherToken, adminToken, product;
let states, calls, onGet, onStop, onClose, failCreate, down;
const json = (data, status = 200) => new globalThis.Response(JSON.stringify(data), { status });
const formatDate = (date) =>
  new Date(date.getTime() + 25200000).toISOString().slice(0, 19).replace("T", " ");
const snapshot = (state) => ({
  order_id: state.id,
  status_code: state.status === "settlement" ? "200" : "201",
  gross_amount: String(state.amount) + ".00",
  transaction_id: state.transactionId,
  transaction_status: state.status,
  payment_type: state.channel,
  currency: "IDR",
  settlement_time: formatDate(new Date()),
  ...(state.extra ?? {}),
});

before(async () => {
  mock.method(globalThis, "fetch", async (url, init) => {
    if (typeof url !== "string" || !/^https:\/\/(api|app)\.sandbox\.midtrans\.com\//.test(url))
      return realFetch(url, init);
    calls.push({ url, init });
    if (down) throw new Error("provider unavailable " + serverKey);
    if (url.endsWith("/snap/v1/transactions")) {
      const body = JSON.parse(init.body);
      const id = body.transaction_details.order_id;
      const old = states.get(id);
      if (old?.status) return json({ error_messages: ["order_id sudah digunakan"] }, 400);
      const state = {
        id,
        amount: body.transaction_details.gross_amount,
        token: randomUUID(),
        transactionId: randomUUID(),
        channel: "qris",
        status: null,
        closed: false,
      };
      states.set(id, state);
      if (failCreate) throw new Error("response interrupted");
      return json(
        {
          token: state.token,
          redirect_url: `https://app.sandbox.midtrans.com/snap/v4/redirection/${state.token}`,
        },
        201,
      );
    }
    if (url.includes("/snap/v1/transactions/")) {
      assert.equal(init.headers.Authorization, serverKey);
      const snapToken = url.split("/").at(-2);
      const state = [...states.values()].find((entry) => entry.token === snapToken);
      if (onClose) return onClose(state);
      if (!state) return json({ error_messages: ["token not found"] }, 404);
      if (state.closed) return json({ error_messages: ["token already canceled"] }, 400);
      if (state.status === "pending")
        return json({ error_messages: ["Transaction is on progress"] }, 400);
      state.closed = true;
      return json({ canceled_at: new Date().toISOString() });
    }
    assert.equal(
      init.headers.Authorization,
      `Basic ${Buffer.from(serverKey + ":").toString("base64")}`,
    );
    const [, id, action] = /\/v2\/([^/]+)\/(status|cancel|expire)$/.exec(url);
    const state = states.get(id);
    if (action === "status") {
      if (onGet) return onGet(state);
      return state?.status ? json(snapshot(state)) : json({ status_code: "404" }, 404);
    }
    if (onStop) return onStop(state, action);
    if (state?.status === "pending") state.status = action === "expire" ? "expire" : "cancel";
    return json(state ? snapshot(state) : { status_code: "404" });
  });
  mongo = await MongoMemoryReplSet.create({ binary: { version: "8.2.6" }, replSet: { count: 1 } });
  config = getConfig({
    MONGODB_URI: mongo.getUri("sync_qa"),
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
  for (const collection of ["users", "products", "orders", "reviews", "wishlists"])
    await mongoose.connection.db.collection(collection).deleteMany({});
  [buyer, other, admin] = await User.create([
    { name: "Buyer", email: "buyer@example.test", password: "fixture", address: addressInput() },
    { name: "Other", email: "other@example.test", password: "fixture", address: addressInput() },
    { name: "Admin", email: "admin@example.test", password: "fixture", role: "admin" },
  ]);
  [token, otherToken, adminToken] = [buyer, other, admin].map((x) =>
    jwt.sign({ id: x.id }, secret),
  );
  product = await Product.create(productInput());
  states = new Map();
  calls = [];
  onGet = onStop = onClose = null;
  failCreate = down = false;
});
after(async () => {
  mock.restoreAll();
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

async function request(path, body, who = token, method = "POST") {
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
    method,
    headers: {
      ...(who ? { Authorization: `Bearer ${who}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  assert.equal(result.success, response.ok);
  return { ...result, status: response.status };
}
async function place(who = token, session = true) {
  const made = await request("/orders", { product_id: product.id }, who);
  assert.equal(made.status, 201);
  if (session)
    assert.equal((await request(`/orders/${made.data.id}/payment`, {}, who)).status, 201);
  return await Order.findById(made.data.id);
}
const stateOf = (order) => states.get(order.payment.merchantOrderId);
const sync = (order, who = token) => request(`/orders/${order.id}/payment/sync`, {}, who);
const cancel = (order, who = token) => request(`/orders/${order.id}/cancel`, {}, who);
const unblock = (order) =>
  Order.updateOne({ _id: order.id }, { "payment.nextSyncAt": new Date(0) });
function signed(order, overrides = {}) {
  const body = {
    order_id: order.payment.merchantOrderId,
    status_code: "200",
    gross_amount: `${order.total_price}.00`,
    transaction_status: "settlement",
    ...overrides,
  };
  body.signature_key = createHash("sha512")
    .update(body.order_id + body.status_code + body.gross_amount + serverKey)
    .digest("hex");
  return body;
}
const notify = (order, overrides) =>
  request("/payments/midtrans/notification", signed(order, overrides), null);
async function backdate(order) {
  const expiresAt = new Date(Date.now() - 20000);
  await Order.collection.updateOne(
    { _id: order._id },
    {
      $set: {
        expiresAt,
        createdAt: new Date(expiresAt - 21600000),
        "payment.requestedAt": new Date(expiresAt - 180000),
        "payment.sessionExpiresAt": new Date(expiresAt - 120000),
      },
    },
  );
}

for (const channel of ["qris", "bank_transfer", "echannel"])
  test(`${channel}: settlement lewat webhook -> Diproses dan Terjual atomik, duplikat tidak menambah versi`, async () => {
    const order = await place();
    const state = stateOf(order);
    state.status = "settlement";
    state.channel = channel;
    if (channel === "bank_transfer")
      state.extra = { va_numbers: [{ bank: "bca", va_number: "123456789" }] };
    const first = await notify(order);
    assert.equal(first.status, 200);
    assert.deepEqual(first.data, { received: true });
    const paid = await Order.findById(order.id);
    assert.equal(paid.status, "DIPROSES");
    assert.equal(paid.payment.status, "settled");
    assert.equal(paid.payment.channel, channel === "bank_transfer" ? "bca_va" : channel);
    assert.ok(paid.payment.paidAt instanceof Date);
    assert.equal((await Product.findById(product.id)).status, "sold");
    assert.equal((await notify(order, { transaction_status: "pending" })).status, 200);
    assert.equal((await Order.findById(order.id)).__v, paid.__v);
    await assertDataReady(mongoose.connection);
  });

test("webhook palsu/replay status tidak dipercaya; GET provider tetap pending", async () => {
  const order = await place();
  stateOf(order).status = "pending";
  const body = signed(order);
  body.signature_key = "0".repeat(128);
  assert.equal(
    (await request("/payments/midtrans/notification", body, null)).code,
    "INVALID_SIGNATURE",
  );
  assert.equal(calls.filter((x) => x.url.includes("/v2/")).length, 0);
  assert.equal((await notify(order)).status, 200);
  assert.equal((await Order.findById(order.id)).payment.status, "pending");
  assert.equal((await Product.findById(product.id)).status, "reserved");
  assert.equal((await notify(order, { gross_amount: "1.00" })).code, "PAYMENT_MISMATCH");
  assert.equal((await request("/payments/midtrans/notification", {}, null)).status, 422);
});

test("sinkronisasi privat: owner/Admin, role/ownership, body, throttle dan metadata tidak bocor", async () => {
  const order = await place();
  stateOf(order).status = "pending";
  assert.equal((await sync(order, null)).status, 401);
  assert.equal((await sync(order, otherToken)).status, 403);
  assert.equal(
    (await request(`/orders/${order.id}/payment/sync`, { status: "settled" })).status,
    422,
  );
  const result = await sync(order);
  assert.equal(result.status, 200);
  assert.equal(result.data.payment.status, "pending");
  for (const field of ["syncToken", "snapToken", "redirectUrl", serverKey])
    assert.ok(!JSON.stringify(result.data).includes(field));
  assert.equal((await sync(order, adminToken)).code, "PAYMENT_SYNC_THROTTLED");
  await unblock(order);
  assert.equal((await sync(order, adminToken)).status, 200);
  await assertDataReady(mongoose.connection);
});

test("404 sebelum kanal dipilih tidak membatalkan order atau melepas stok", async () => {
  const order = await place();
  const result = await sync(order);
  assert.equal(result.status, 200);
  assert.equal(result.data.payment.status, "ready");
  assert.equal(result.data.status, "MENUNGGU_PEMBAYARAN");
  assert.equal((await Product.findById(product.id)).status, "reserved");
});

test("token hilang akibat respons terputus: pulih dengan merchantOrderId sama, tenggat tidak bertambah", async () => {
  failCreate = true;
  const order = await place(token, false);
  assert.equal((await request(`/orders/${order.id}/payment`, {})).status, 503);
  const oldToken = stateOf(order).token;
  failCreate = false;
  assert.equal((await sync(order)).status, 200);
  const saved = await Order.findById(order.id);
  assert.equal(saved.payment.status, "ready");
  assert.notEqual(saved.payment.snapToken, oldToken);
  assert.equal(saved.payment.merchantOrderId, order.payment.merchantOrderId);
  assert.equal(saved.expiresAt.getTime(), order.expiresAt.getTime());
  assert.equal(states.size, 1);
  await assertDataReady(mongoose.connection);
});

for (const pending of [false, true])
  test(`batal ${pending ? "sesudah" : "sebelum"} memilih kanal: tutup sesi dan konfirmasi, bisa dipesan ulang`, async () => {
    const order = await place();
    if (pending) stateOf(order).status = "pending";
    assert.equal((await cancel(order)).status, 200);
    assert.equal((await cancel(order)).status, 200);
    assert.equal(stateOf(order).closed, true);
    const saved = await Order.findById(order.id);
    assert.equal(saved.status, "DIBATALKAN");
    assert.equal(saved.payment.status, "cancelled");
    assert.equal(saved.cancellation_reason, "buyer");
    assert.equal((await Product.findById(product.id)).status, "available");
    assert.equal((await request("/orders", { product_id: product.id }, otherToken)).status, 201);
    await assertDataReady(mongoose.connection);
  });

test("cancel berpacu dengan settlement: hasil lunas menang, tidak ada stok tersedia", async () => {
  const order = await place();
  stateOf(order).status = "pending";
  onStop = (state) => {
    state.status = "settlement";
    return json(snapshot(state));
  };
  assert.equal((await cancel(order)).code, "INVALID_TRANSITION");
  assert.equal((await Order.findById(order.id)).status, "DIPROSES");
  assert.equal((await Product.findById(product.id)).status, "sold");
});

test("dua pemeriksaan bersamaan dan webhook duplikat tidak mengerjakan pembayaran dua kali", async () => {
  const order = await place();
  stateOf(order).status = "settlement";
  let entered, finish;
  const started = new Promise((resolve) => {
    entered = resolve;
  });
  const wait = new Promise((resolve) => {
    finish = resolve;
  });
  onGet = async (state) => {
    entered();
    await wait;
    return json(snapshot(state));
  };
  const first = sync(order);
  await started;
  try {
    assert.equal((await cancel(order)).code, "PAYMENT_SYNC_IN_PROGRESS");
    assert.equal((await notify(order)).status, 503);
    assert.equal(
      (await request(`/orders/${order.id}/payment`, {})).code,
      "PAYMENT_SYNC_IN_PROGRESS",
    );
  } finally {
    finish();
  }
  assert.equal((await first).status, 200);
  onGet = null;
  assert.equal((await notify(order)).status, 200);
  assert.equal((await Product.findById(product.id)).status, "sold");
});

test("provider offline: pembatalan gagal aman, bisa dipulihkan lewat sync", async () => {
  const order = await place();
  stateOf(order).status = "pending";
  down = true;
  const result = await cancel(order);
  assert.equal(result.code, "PAYMENT_STATUS_UNKNOWN");
  assert.ok(!JSON.stringify(result).includes(serverKey));
  assert.equal((await Product.findById(product.id)).status, "reserved");
  down = false;
  await unblock(order);
  assert.equal((await sync(order)).data.payment.status, "pending");
  assert.equal((await request(`/orders/${order.id}/payment`, {})).status, 200);
});

test("gagal menutup Snap atau transaksi tetap pending: stok tidak dilepas", async () => {
  const order = await place();
  stateOf(order).status = "pending";
  onStop = (state) => json(snapshot(state));
  assert.equal((await cancel(order)).status, 503);
  assert.equal((await Product.findById(product.id)).status, "reserved");
  stateOf(order).status = "deny";
  onStop = null;
  onClose = () => json({ error_messages: ["token not found"] }, 404);
  assert.equal((await cancel(order)).status, 503);
  assert.equal((await Product.findById(product.id)).status, "reserved");
});

for (const status of ["deny", "failure", "cancel", "expire"])
  test(`${status}: sesi ditutup sebelum status gagal melepaskan stok`, async () => {
    const order = await place();
    stateOf(order).status = status;
    assert.equal((await notify(order)).status, 200);
    assert.equal(stateOf(order).closed, true);
    assert.equal((await Order.findById(order.id)).status, "DIBATALKAN");
    assert.equal((await Product.findById(product.id)).status, "available");
    await assertDataReady(mongoose.connection);
  });

test("batas enam jam: pembacaan katalog merekonsiliasi pending -> expired -> stok tersedia", async () => {
  const order = await place();
  stateOf(order).status = "pending";
  await backdate(order);
  const result = await request("/products", undefined, null, "GET");
  assert.equal(result.status, 200);
  assert.equal((await Order.findById(order.id)).payment.status, "expired");
  assert.equal((await Product.findById(product.id)).status, "available");
  await assertDataReady(mongoose.connection);
});

test("provider offline saat kedaluwarsa: katalog tetap terbuka, stok tetap dipesan dan retry dibatasi", async () => {
  const order = await place();
  await backdate(order);
  down = true;
  assert.equal((await request("/products", undefined, null, "GET")).status, 200);
  const count = calls.length;
  assert.equal((await request("/products", undefined, null, "GET")).status, 200);
  assert.equal(calls.length, count);
  assert.equal((await Product.findById(product.id)).status, "reserved");
});

test("expiry kanal lebih singkat dibaca dan dipakai tanpa memperpanjang enam jam", async () => {
  const order = await place();
  stateOf(order).status = "pending";
  stateOf(order).extra = { expiry_time: formatDate(new Date(Date.now() + 120000)) };
  assert.equal((await sync(order)).status, 200);
  const saved = await Order.findById(order.id);
  assert.ok(saved.payment.providerExpiresAt < saved.expiresAt);
  stateOf(order).extra.expiry_time = formatDate(new Date(Date.now() - 1000));
  await unblock(order);
  assert.equal((await sync(order)).data.status, "DIBATALKAN");
});

test("blanket expiry + GET 404 menangani token hilang, 404 saja tidak cukup", async () => {
  const order = await place(token, false);
  failCreate = true;
  assert.equal((await request(`/orders/${order.id}/payment`, {})).status, 503);
  await backdate(order);
  failCreate = false;
  await expireOrders(new Date(), config);
  assert.equal((await Order.findById(order.id)).status, "DIBATALKAN");
  assert.equal((await Product.findById(product.id)).status, "available");
});

for (const [name, extra] of [
  ["nominal", { gross_amount: "1.00" }],
  ["currency", { currency: "USD" }],
  ["merchant order", { order_id: "other-order" }],
  ["kanal", { payment_type: "credit_card" }],
  ["fraud", { fraud_status: "challenge" }],
  ["status", { transaction_status: "refund" }],
])
  test(`${name} provider berbeda: perlu pemeriksaan, tidak diproses atau melepas stok`, async () => {
    const order = await place();
    stateOf(order).status = "settlement";
    stateOf(order).extra = extra;
    const result = await sync(order);
    assert.equal(result.status, 200);
    assert.equal(result.data.payment.status, "review_required");
    assert.ok(result.data.payment.reviewReason);
    assert.equal((await Product.findById(product.id)).status, "reserved");
    await assertDataReady(mongoose.connection);
  });

test("settlement sesudah batal dan dipesan Buyer lain: flag review, kunci Buyer kedua tetap", async () => {
  const order = await place();
  assert.equal((await cancel(order)).status, 200);
  const second = await place(otherToken, false);
  stateOf(order).status = "settlement";
  assert.equal((await notify(order)).status, 200);
  const old = await Order.findById(order.id);
  assert.equal(old.status, "DIBATALKAN");
  assert.equal(old.payment.reviewReason, "LATE_SETTLEMENT");
  assert.equal(String((await Product.findById(product.id)).reservation_order_id), second.id);
  await assertDataReady(mongoose.connection);
});

test("rollback: gagal menyimpan order lunas tidak meninggalkan produk Terjual", async () => {
  const order = await place();
  stateOf(order).status = "settlement";
  await mongoose.connection.db.command({
    collMod: "orders",
    validator: { "payment.status": { $ne: "settled" } },
    validationLevel: "strict",
    validationAction: "error",
  });
  try {
    assert.equal((await sync(order)).status, 503);
    assert.equal((await Product.findById(product.id)).status, "reserved");
    assert.equal((await Order.findById(order.id)).status, "MENUNGGU_PEMBAYARAN");
  } finally {
    await mongoose.connection.db.command({
      collMod: "orders",
      validator: {},
      validationLevel: "off",
    });
  }
  await unblock(order);
  assert.equal((await sync(order)).data.status, "DIPROSES");
});

test("alur gateway lunas -> kirim -> diterima -> ulasan, tanpa bukti manual", async () => {
  const order = await place();
  stateOf(order).status = "settlement";
  const paid = (await sync(order)).data;
  assert.equal(
    (
      await request(
        `/admin/orders/${order.id}/actions`,
        { type: "ship", service: "JNE REG", number: "QA12345678", version: paid.version },
        adminToken,
      )
    ).status,
    200,
  );
  assert.equal((await request(`/orders/${order.id}/receive`, {})).status, 200);
  assert.equal(
    (
      await request(`/orders/${order.id}/review`, {
        rating: 5,
        comment: "Barang sesuai ukuran dan foto.",
      })
    ).status,
    201,
  );
  assert.equal((await notify(order)).status, 200);
  assert.equal((await Order.findById(order.id)).status, "SELESAI");
  await assertDataReady(mongoose.connection);
});

test("GET gagal autentikasi bukan 404, termasuk setelah deadline; reservasi tetap", async () => {
  const order = await place();
  await backdate(order);
  onGet = () => json({ status_code: "404", status_message: "bad key" }, 401);
  assert.equal((await sync(order)).status, 503);
  assert.equal((await Product.findById(product.id)).status, "reserved");
});

test("settlement dengan kunci milik order lain tidak mengambil atau menjual stoknya", async () => {
  const order = await place();
  stateOf(order).status = "settlement";
  const owner = new mongoose.Types.ObjectId();
  await Product.updateOne({ _id: product.id }, { reservation_order_id: owner });
  const result = await sync(order);
  assert.equal(result.data.payment.reviewReason, "STOCK_CONFLICT");
  const stock = await Product.findById(product.id);
  assert.equal(stock.status, "reserved");
  assert.equal(String(stock.reservation_order_id), String(owner));
});

test("pending lama tidak menurunkan lunas; refund ditandai untuk Admin dan pengiriman ditolak", async () => {
  const order = await place();
  stateOf(order).status = "settlement";
  const paid = (await sync(order)).data;
  stateOf(order).status = "pending";
  assert.equal((await notify(order)).status, 200);
  const stillPaid = await Order.findById(order.id);
  assert.equal(stillPaid.status, "DIPROSES");
  assert.equal(stillPaid.__v, paid.version);
  assert.ok(!calls.some((entry) => /\/v2\/.*\/(cancel|expire)$/.test(entry.url)));
  stateOf(order).status = "refund";
  assert.equal((await notify(order)).status, 200);
  const review = await Order.findById(order.id);
  assert.equal(review.payment.status, "settled");
  assert.equal(review.payment.reviewReason, "UNEXPECTED_STATUS");
  assert.equal(
    (
      await request(
        `/admin/orders/${order.id}/actions`,
        {
          type: "ship",
          service: "JNE REG",
          number: "QA12345678",
          version: review.__v,
        },
        adminToken,
      )
    ).status,
    409,
  );
  await assertDataReady(mongoose.connection);
});

test("respons pemeriksaan yang kehilangan lease tidak menimpa settlement dari pemeriksaan baru", async () => {
  const order = await place();
  stateOf(order).status = "pending";
  let entered, finish;
  const started = new Promise((resolve) => {
    entered = resolve;
  });
  const wait = new Promise((resolve) => {
    finish = resolve;
  });
  onGet = async (state) => {
    const stale = snapshot(state);
    entered();
    await wait;
    return json(stale);
  };
  const first = sync(order);
  await started;
  try {
    await Order.updateOne({ _id: order.id }, { "payment.syncUntil": new Date(0) });
    stateOf(order).status = "settlement";
    onGet = null;
    assert.equal((await notify(order)).status, 200);
  } finally {
    finish();
  }
  assert.equal((await first).status, 503);
  assert.equal((await Order.findById(order.id)).payment.status, "settled");
  assert.equal((await Product.findById(product.id)).status, "sold");
});
