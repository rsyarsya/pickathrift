const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { once } = require("node:events");
const { randomBytes } = require("node:crypto");
const { attachRuntime } = require("../services/serverless");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const mongoose = require("mongoose");

async function serve(app, run) {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}
test("entrypoint exports Express without needing environment or database at import", () => {
  const app = require("../app");
  assert.equal(typeof app, "function");
  assert.equal(typeof app.use, "function");
  assert.equal(typeof app.createApp, "function");
});
test("parallel cold requests initialize once and warm requests reuse the handler", async () => {
  let calls = 0;
  const app = express();
  attachRuntime(
    app,
    () => ({ jwtSecret: randomBytes(48).toString("hex"), nodeEnv: "test" }),
    async () => {
      calls++;
    },
  );
  await serve(app, async (base) => {
    const responses = await Promise.all(Array.from({ length: 8 }, () => fetch(base)));
    assert.ok(responses.every((r) => r.status === 200));
    assert.equal((await fetch(base)).status, 200);
    assert.equal(calls, 1);
  });
});
test("failed initialization is sanitized and retried on the next request", async () => {
  let calls = 0;
  const app = express();
  attachRuntime(
    app,
    () => ({ jwtSecret: "fixture", nodeEnv: "test" }),
    async () => {
      if (++calls === 1) throw new Error("must-not-leak-secret");
    },
  );
  await serve(app, async (base) => {
    const failed = await fetch(base);
    assert.equal(failed.status, 503);
    assert.ok(!(await failed.text()).includes("must-not-leak-secret"));
    assert.equal((await fetch(base)).status, 200);
    assert.equal(calls, 2);
  });
});
test("real entrypoint connects to replica set and shares sessions across warm requests", async () => {
  const mongo = await MongoMemoryReplSet.create({
    binary: { version: "8.2.6" },
    replSet: { count: 1 },
  });
  const saved = { ...process.env };
  try {
    process.env.MONGODB_URI = mongo.getUri("serverless");
    process.env.JWT_SECRET = randomBytes(48).toString("hex");
    process.env.NODE_ENV = "test";
    process.env.STORAGE_DRIVER = "local";
    delete process.env.VERCEL;
    const app = require("../app");
    await serve(app, async (base) => {
      const body = { name: "Buyer QA", email: "serverless@example.test", password: "Password123!" };
      assert.equal(
        (
          await fetch(base + "/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        ).status,
        201,
      );
      const login = await fetch(base + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await login.json();
      assert.equal(login.status, 200);
      assert.equal(
        (
          await fetch(base + "/api/users/me", {
            headers: { Authorization: "Bearer " + json.data.token },
          })
        ).status,
        200,
      );
    });
  } finally {
    for (const name of Object.keys(process.env)) if (!(name in saved)) delete process.env[name];
    Object.assign(process.env, saved);
    await mongoose.disconnect();
    await mongo.stop();
  }
});
