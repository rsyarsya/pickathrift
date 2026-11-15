const { randomBytes } = require("node:crypto");
const { mkdtemp, mkdir, copyFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const User = require("../models/user");
const Product = require("../models/products");
const Order = require("../models/order");
const { PAYMENT_WINDOW_MS } = require("../lib/order-options");
const { start } = require("../webthrift");
const { addressInput, orderInput, productInput } = require("./fixtures");

const password = "PickaUji2026!";
const expiredOrderId = "507f1f77bcf86cd799439014";
async function run(mongo, uploadDir) {
  const mongoUri = mongo.getUri("browser_qa");
  await mkdir(path.join(uploadDir, "products"));
  await copyFile(
    path.join(__dirname, "../../fe/public/products/work-jacket-olive.jpg"),
    path.join(uploadDir, "products/uji.jpg"),
  );
  await mongoose.connect(mongoUri);
  const hash = await bcrypt.hash(password, 10);
  const [, buyer] = await User.create([
    { name: "Admin Uji", email: "admin@pickathrift.test", password: hash, role: "admin" },
    { name: "Buyer Uji", email: "buyer@pickathrift.test", password: hash, address: addressInput() },
    {
      name: "Pembeli Uji",
      email: "other@pickathrift.test",
      password: hash,
      address: addressInput(),
    },
  ]);
  const images = ["/uploads/products/uji.jpg"];
  const [, , expiredProduct] = await Product.create(
    ["Jaket Uji Alur Lengkap", "Jaket Uji Stok", "Jaket Uji Kedaluwarsa"].map((name) =>
      productInput({ name, images }),
    ),
  );
  const expiresAt = new Date(Date.now() - 1000);
  await Order.create({
    ...orderInput(expiredProduct, {
      createdAt: new Date(expiresAt.getTime() - PAYMENT_WINDOW_MS),
      expiresAt,
    }),
    _id: expiredOrderId,
    buyer_id: buyer.id,
    product_id: expiredProduct.id,
  });
  await Product.updateOne(
    { _id: expiredProduct.id },
    { status: "reserved", reservation_order_id: expiredOrderId },
  );
  await mongoose.disconnect();
  return start({
    mongoUri,
    jwtSecret: randomBytes(48).toString("hex"),
    port: 5107,
    uploadDir,
    nodeEnv: "test",
  });
}

async function startBrowserServer() {
  let mongo, uploadDir, server;
  async function stop() {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
    if (uploadDir) await rm(uploadDir, { recursive: true, force: true });
  }

  try {
    mongo = await MongoMemoryReplSet.create({
      binary: { version: "8.2.6" },
      replSet: { count: 1 },
    });
    uploadDir = await mkdtemp(path.join(tmpdir(), "pickathrift-browser-"));
    server = await run(mongo, uploadDir);
    return stop;
  } catch (error) {
    await stop();
    throw error;
  }
}

module.exports = { startBrowserServer };
