const { before, after, test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const { start } = require("../webthrift");
const { getConfig } = require("../config");
const User = require("../models/user");

const secret = randomBytes(48).toString("hex");
// Token palsu berbentuk JSON agar tes tidak menghubungi server Google.
const credential = (profile) => JSON.stringify(profile);
let mongo, server, base, admin;

async function request(route, { method = "GET", token, body } = {}) {
  const response = await fetch(`${base}/api${route}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, json: await response.json() };
}

const google = (profile) =>
  request("/auth/google", { method: "POST", body: { credential: credential(profile) } });

before(async () => {
  mongo = await MongoMemoryReplSet.create({ binary: { version: "8.2.6" }, replSet: { count: 1 } });
  server = await start({
    mongoUri: mongo.getUri("pickathrift_google_test"),
    jwtSecret: secret,
    port: 0,
    nodeEnv: "test",
    googleClientId: "test-client.apps.googleusercontent.com",
    verifyGoogleIdToken: async (value) => {
      if (value === "rusak") throw new Error("Token tidak valid");
      return JSON.parse(value);
    },
  });
  base = `http://127.0.0.1:${server.address().port}`;
  const hash = await bcrypt.hash("Password123!", 10);
  admin = await User.create({
    name: "Admin QA",
    email: "admin@example.test",
    password: hash,
    role: "admin",
  });
  await User.create({ name: "Buyer Lama", email: "lama@example.test", password: hash });
});

after(async () => {
  if (server)
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test("Google membuat akun buyer baru tanpa kata sandi lalu memberi sesi", async () => {
  const profile = { sub: "g-baru", email: "Baru@Gmail.test", email_verified: true, name: "Baru" };
  const first = await google(profile);
  assert.equal(first.status, 200);
  assert.equal(first.json.data.user.email, "baru@gmail.test");
  assert.equal(first.json.data.user.role, "buyer");
  assert.ok(!("googleId" in first.json.data.user));
  const me = await request("/users/me", { token: first.json.data.token });
  assert.equal(me.status, 200);
  assert.equal(me.json.data.id, first.json.data.user.id);
  const stored = await User.findById(first.json.data.user.id).select("+password");
  assert.equal(stored.password, undefined);
  assert.equal(stored.googleId, "g-baru");

  const again = await google(profile);
  assert.equal(again.json.data.user.id, first.json.data.user.id);
  assert.equal(await User.countDocuments({ email: "baru@gmail.test" }), 1);

  // Akun Google tidak bisa masuk lewat form kata sandi, dan tidak membuat 500.
  const password = await request("/auth/login", {
    method: "POST",
    body: { email: "baru@gmail.test", password: "apa-saja", role: "buyer" },
  });
  assert.equal(password.status, 401);
  assert.equal(password.json.code, "INVALID_CREDENTIALS");
});

test("email buyer yang sudah terdaftar ditautkan dan kata sandinya tetap berlaku", async () => {
  const linked = await google({ sub: "g-lama", email: "lama@example.test", email_verified: true });
  assert.equal(linked.status, 200);
  assert.equal(linked.json.data.user.name, "Buyer Lama");
  assert.equal((await User.findOne({ email: "lama@example.test" })).googleId, "g-lama");
  const password = await request("/auth/login", {
    method: "POST",
    body: { email: "lama@example.test", password: "Password123!", role: "buyer" },
  });
  assert.equal(password.status, 200);
  // Akun Google lain dengan email yang sama ditolak.
  const other = await google({ sub: "g-lain", email: "lama@example.test", email_verified: true });
  assert.equal(other.status, 401);
});

test("admin, email belum terverifikasi, dan token rusak ditolak", async () => {
  const asAdmin = await google({ sub: "g-admin", email: admin.email, email_verified: true });
  assert.equal(asAdmin.status, 403);
  assert.equal((await User.findById(admin.id)).googleId, undefined);
  const unverified = await google({ sub: "g-x", email: "x@example.test", email_verified: false });
  assert.equal(unverified.status, 401);
  assert.equal(unverified.json.code, "GOOGLE_TOKEN_INVALID");
  const broken = await request("/auth/google", {
    method: "POST",
    body: { credential: "rusak" },
  });
  assert.equal(broken.status, 401);
  assert.equal(await User.countDocuments({ email: "x@example.test" }), 0);
});

test("input Google yang salah bentuk ditolak 422", async () => {
  for (const body of [
    {},
    { credential: 5 },
    { credential: "" },
    { credential: "a", role: "admin" },
  ])
    assert.equal((await request("/auth/google", { method: "POST", body })).status, 422);
});

test("GOOGLE_CLIENT_ID dibaca dari env dan boleh kosong", () => {
  const env = { MONGODB_URI: "mongodb://unused", JWT_SECRET: secret };
  assert.equal(getConfig(env).googleClientId, undefined);
  assert.equal(getConfig({ ...env, GOOGLE_CLIENT_ID: " id.apps " }).googleClientId, "id.apps");
});

test("tanpa GOOGLE_CLIENT_ID endpoint Google menjawab 503", async () => {
  const { createApp } = require("../app");
  const { once } = require("node:events");
  const plain = createApp({ jwtSecret: secret }).listen(0);
  await once(plain, "listening");
  try {
    const response = await fetch(`http://127.0.0.1:${plain.address().port}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: "apa-saja" }),
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, "GOOGLE_DISABLED");
  } finally {
    plain.close();
  }
});
