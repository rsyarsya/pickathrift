const { isDeepStrictEqual } = require("node:util");
const Product = require("../models/products");
const serialize = require("./serializers");
const { CATEGORIES } = require("./product-options");

class DataMigrationRequired extends Error {
  constructor() {
    super("Data lama perlu diperiksa dengan migrate:legacy sebelum server dijalankan.");
    this.code = "DATA_MIGRATION_REQUIRED";
  }
}

const productFields = [
  "name",
  "brand",
  "category",
  "size",
  "condition",
  "style",
  "color",
  "price",
  "images",
  "measurements",
  "status",
  "active",
  "__v",
];
const dateValid = (value) => value instanceof Date && Number.isFinite(value.getTime());

// Semua pembacaan melalui collection agar normalisasi/default Mongoose tidak menutupi data lama.
async function inspectLegacyData(connection, session) {
  const options = session ? { session } : {};
  // Operasi dalam satu session transaksi tidak dijalankan paralel.
  const users = await connection.db.collection("users").find({}, options).toArray();
  const products = await connection.db.collection("products").find({}, options).toArray();
  const orders = await connection.db.collection("orders").find({}, options).toArray();
  const plan = { users: [], products: [], orders: [], issues: [] };
  const issue = (collection, id, code, fields) =>
    plan.issues.push({ collection, id: String(id), code, fields });
  const emails = new Map();
  for (const user of users) {
    const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      issue("users", user._id, "INVALID_EMAIL", ["email"]);
      continue;
    }
    const ids = emails.get(email) ?? [];
    ids.push(user._id);
    emails.set(email, ids);
    if (email !== user.email) plan.users.push({ id: user._id, set: { email } });
  }
  for (const ids of emails.values()) {
    if (ids.length > 1) for (const id of ids) issue("users", id, "EMAIL_COLLISION", ["email"]);
  }
  const canonicalProducts = new Map();
  for (const raw of products) {
    const legacyShape =
      raw.name === undefined || raw.images === undefined || raw.active === undefined;
    if (
      legacyShape &&
      CATEGORIES.includes(raw.category) &&
      CATEGORIES.includes(raw.clothing_type) &&
      raw.category !== raw.clothing_type
    ) {
      issue("products", raw._id, "CATEGORY_CONFLICT", ["category", "clothing_type"]);
      continue;
    }
    const candidate = new Product({
      ...raw,
      name: raw.name ?? raw.title,
      images: raw.images ?? (raw.image_url ? [raw.image_url] : undefined),
      category: CATEGORIES.includes(raw.category) ? raw.category : raw.clothing_type,
      status: raw.status === "inactive" ? "available" : raw.status,
      active: raw.status === "inactive" ? false : (raw.active ?? true),
      __v: raw.__v ?? 0,
    });
    try {
      await candidate.validate();
      const badDates = ["createdAt", "updatedAt"].filter((key) => !dateValid(raw[key]));
      if (badDates.length) {
        issue("products", raw._id, "PRODUCT_REVIEW_REQUIRED", badDates);
        continue;
      }
      const value = candidate.toObject();
      const set = Object.fromEntries(productFields.map((key) => [key, value[key]]));
      canonicalProducts.set(String(raw._id), serialize.product(candidate));
      if (productFields.some((key) => !isDeepStrictEqual(raw[key], set[key]))) {
        plan.products.push({ id: raw._id, set });
      }
    } catch (error) {
      if (error.name !== "ValidationError") throw error;
      issue("products", raw._id, "PRODUCT_REVIEW_REQUIRED", Object.keys(error.errors));
    }
  }
  for (const order of orders) {
    if (order.product_snapshot) continue;
    const product = canonicalProducts.get(String(order.product_id));
    if (!product) {
      issue("orders", order._id, "PRODUCT_REVIEW_REQUIRED", ["product_id"]);
      continue;
    }
    if (!Number.isSafeInteger(order.total_price) || order.total_price < 1000) {
      issue("orders", order._id, "ORDER_PRICE_REVIEW_REQUIRED", ["total_price"]);
      continue;
    }
    // BE lama hanya menyimpan harga barang pada total_price, belum termasuk ongkir.
    plan.orders.push({
      id: order._id,
      set: {
        product_snapshot: { ...product, price: order.total_price },
        product_snapshot_source: "legacy-current-product",
      },
    });
  }
  plan.summary = {
    users: plan.users.length,
    products: plan.products.length,
    orders: plan.orders.length,
    blockers: plan.issues.length,
  };
  return plan;
}

async function assertDataReady(connection) {
  const plan = await inspectLegacyData(connection);
  if (plan.issues.length || plan.users.length || plan.products.length || plan.orders.length) {
    throw new DataMigrationRequired();
  }
}

async function migrateLegacyData(connection, apply = false) {
  if (!apply) return inspectLegacyData(connection);
  const preview = await inspectLegacyData(connection);
  if (preview.issues.length) throw new DataMigrationRequired();
  // DDL di luar transaksi; perubahan data di bawah tetap seluruhnya atomik.
  await connection.db.collection("users").createIndex({ email: 1 }, { unique: true });
  const session = await connection.startSession();
  try {
    let applied;
    await session.withTransaction(async () => {
      const plan = await inspectLegacyData(connection, session);
      if (plan.issues.length) throw new DataMigrationRequired();
      for (const collection of ["users", "products", "orders"]) {
        for (const entry of plan[collection]) {
          await connection.db
            .collection(collection)
            .updateOne({ _id: entry.id }, { $set: entry.set }, { session });
        }
      }
      applied = plan;
    });
    return applied;
  } finally {
    await session.endSession();
  }
}

module.exports = { inspectLegacyData, assertDataReady, migrateLegacyData, DataMigrationRequired };
