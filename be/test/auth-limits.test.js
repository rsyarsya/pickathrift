const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomBytes } = require("node:crypto");
const { createApp } = require("../app");
const { getConfig } = require("../config");
const User = require("../models/user");
const bcrypt = require("bcryptjs");

async function withServer(run, overrides = {}) {
  const app = createApp({
    jwtSecret: randomBytes(48).toString("hex"),
    nodeEnv: "production",
    ...overrides,
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    await run(async (path, body = {}) =>
      fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("production: 20 gagal login dibatasi 429 dengan Retry-After dan JSON konsisten", async () => {
  await withServer(async (request) => {
    for (let i = 0; i < 20; i++)
      assert.equal((await request("/auth/login", { email: "invalid" })).status, 422);
    const result = await request("/auth/login", { email: "invalid" });
    assert.equal(result.status, 429);
    assert.ok(Number(result.headers.get("Retry-After")) > 0);
    assert.equal(result.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await result.json(), {
      success: false,
      code: "RATE_LIMITED",
      message: "Terlalu banyak percobaan. Coba lagi beberapa menit.",
    });
  });
});

test("login Google berbagi batas login, registrasi memakai batas terpisah", async () => {
  await withServer(async (request) => {
    for (let i = 0; i < 20; i++)
      assert.equal((await request("/auth/google", { credential: "invalid" })).status, 503);
    assert.equal((await request("/auth/login", { email: "invalid" })).status, 429);
    for (let i = 0; i < 30; i++) assert.equal((await request("/auth/register")).status, 422);
    assert.equal((await request("/auth/register")).status, 429);
  });
});

test("satu instance aplikasi tidak menghabiskan batas instance lain", async () => {
  await withServer(async (request) => {
    for (let i = 0; i < 21; i++) await request("/auth/login", { email: "invalid" });
    await withServer(async (other) =>
      assert.equal((await other("/auth/login", { email: "invalid" })).status, 422),
    );
  });
});

test("trust proxy eksplisit dan terbatas; konfigurasi true/negatif ditolak", () => {
  const env = { MONGODB_URI: "mongodb://unused", JWT_SECRET: randomBytes(48).toString("hex") };
  assert.equal(getConfig(env).trustProxy, false);
  assert.equal(getConfig({ ...env, TRUST_PROXY: "1" }).trustProxy, 1);
  for (const value of ["true", "-1", "6", "1.5"])
    assert.throws(() => getConfig({ ...env, TRUST_PROXY: value }), /TRUST_PROXY/);
});

test("login berhasil tidak menghabiskan batas percobaan gagal", async (t) => {
  const user = {
    id: "507f1f77bcf86cd799439011",
    name: "Buyer Uji",
    email: "buyer@example.test",
    role: "buyer",
    password: await bcrypt.hash("PasswordUji123!", 4),
  };
  t.mock.method(User, "findOne", () => ({ select: async () => user }));
  await withServer(async (request) => {
    for (let i = 0; i < 25; i++)
      assert.equal(
        (await request("/auth/login", { email: user.email, password: "PasswordUji123!" })).status,
        200,
      );
    assert.equal(
      (await request("/auth/login", { email: user.email, password: "WrongPassword123!" })).status,
      401,
    );
  });
});
