const { before, after, test, mock } = require("node:test");
const assert = require("node:assert/strict");
const { generateKeyPairSync, randomBytes, sign } = require("node:crypto");
const { OAuth2Client } = require("google-auth-library");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const { start } = require("../webthrift");
const User = require("../models/user");

const clientId = "qa-client.apps.googleusercontent.com";
const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
let mongo, server, base;

before(async () => {
  // Hanya unduhan public key diganti. Verifikasi signature, issuer, audience dan waktu
  // tetap memakai verifyIdToken() asli; ini tidak membuktikan popup Google sungguhan.
  mock.method(OAuth2Client.prototype, "getFederatedSignonCertsAsync", async () => ({
    certs: { "qa-key": keys.publicKey.export({ type: "spki", format: "pem" }) },
  }));
  mongo = await MongoMemoryReplSet.create({ binary: { version: "8.2.6" }, replSet: { count: 1 } });
  server = await start({
    mongoUri: mongo.getUri("google_token_qa"),
    jwtSecret: randomBytes(48).toString("hex"),
    port: 0,
    nodeEnv: "test",
    googleClientId: clientId,
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  mock.restoreAll();
});

function token(overrides = {}, privateKey = keys.privateKey, kid = "qa-key") {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const body =
    encode({ alg: "RS256", typ: "JWT", kid }) +
    "." +
    encode({
      sub: "google-verified-user",
      email: "verified@gmail.com",
      email_verified: true,
      name: "Buyer Verified",
      iss: "https://accounts.google.com",
      aud: clientId,
      iat: now - 60,
      exp: now + 3600,
      ...overrides,
    });
  return body + "." + sign("RSA-SHA256", Buffer.from(body), privateKey).toString("base64url");
}

async function login(credential) {
  const r = await fetch(base + "/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  return { status: r.status, body: await r.json() };
}

test("token dengan signature dan claims valid membuat sesi Buyer melalui verifier asli", async () => {
  const result = await login(token());
  assert.equal(result.status, 200);
  assert.equal(result.body.data.user.role, "buyer");
  assert.ok(result.body.data.token);
  const me = await fetch(base + "/api/users/me", {
    headers: { Authorization: `Bearer ${result.body.data.token}` },
  });
  assert.equal(me.status, 200);
});

for (const [name, credential] of [
  ["audience lain", () => token({ aud: "other-client.apps.googleusercontent.com" })],
  ["issuer lain", () => token({ iss: "https://evil.example.test" })],
  [
    "expired",
    () =>
      token({
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600,
      }),
  ],
  [
    "belum berlaku",
    () =>
      token({
        iat: Math.floor(Date.now() / 1000) + 3600,
        exp: Math.floor(Date.now() / 1000) + 7200,
      }),
  ],
  [
    "signature palsu",
    () => token({}, generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey),
  ],
  ["key ID asing", () => token({}, keys.privateKey, "unknown-key")],
  ["JWT malformed", () => "not.a.jwt"],
])
  test(`${name} ditolak tanpa membuat akun atau sesi`, async () => {
    const before = await User.countDocuments();
    const result = await login(credential());
    assert.equal(result.status, 401);
    assert.equal(result.body.code, "GOOGLE_TOKEN_INVALID");
    assert.equal(result.body.data, undefined);
    assert.equal(await User.countDocuments(), before);
  });
