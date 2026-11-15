const { isDeepStrictEqual } = require("node:util");
const Product = require("../models/products");
const Order = require("../models/order");
const { RESERVED_STATUSES, validPaymentDeadline } = require("./order-options");
const serialize = require("./serializers");
const { CATEGORIES } = require("./product-options");
const { addressInput } = require("./address");

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
  "reservation_order_id",
  "__v",
];
const dateValid = (value) => value instanceof Date && Number.isFinite(value.getTime());

// Semua pembacaan melalui collection agar normalisasi/default Mongoose tidak menutupi data lama.
async function inspectLegacyData(connection, session, config = {}) {
  const options = session ? { session } : {};
  // Operasi dalam satu session transaksi tidak dijalankan paralel.
  const users = await connection.db.collection("users").find({}, options).toArray();
  const products = await connection.db.collection("products").find({}, options).toArray();
  const orders = await connection.db.collection("orders").find({}, options).toArray();
  const reviews = await connection.db.collection("reviews").find({}, options).toArray();
  const wishlists = await connection.db.collection("wishlists").find({}, options).toArray();
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
    const set = {};
    if (email !== user.email) set.email = email;
    if (typeof user.address === "string") {
      if (user.legacy_address !== undefined && user.legacy_address !== user.address) {
        issue("users", user._id, "ADDRESS_REVIEW_REQUIRED", ["address", "legacy_address"]);
      } else {
        set.address = null;
        set.legacy_address = user.address;
      }
    } else if (user.address === undefined) {
      set.address = null;
    } else if (user.address !== null) {
      try {
        const address = addressInput(user.address);
        if (!isDeepStrictEqual(address, user.address)) set.address = address;
      } catch (error) {
        if (error.status !== 422) throw error;
        issue("users", user._id, "ADDRESS_REVIEW_REQUIRED", ["address"]);
      }
    }
    if (Object.keys(set).length) plan.users.push({ id: user._id, set });
  }
  for (const ids of emails.values()) {
    if (ids.length > 1) for (const id of ids) issue("users", id, "EMAIL_COLLISION", ["email"]);
  }
  const buyerIds = new Set(
    users.filter((user) => user.role === "buyer").map((user) => String(user._id)),
  );
  const productIds = new Set(products.map((product) => String(product._id)));
  const wishlistKeys = new Map();
  for (const item of wishlists) {
    if (!buyerIds.has(String(item.user_id)))
      issue("wishlists", item._id, "WISHLIST_OWNER_REVIEW_REQUIRED", ["user_id"]);
    if (!productIds.has(String(item.product_id)))
      issue("wishlists", item._id, "WISHLIST_PRODUCT_REVIEW_REQUIRED", ["product_id"]);
    const key = `${item.user_id}:${item.product_id}`;
    const ids = wishlistKeys.get(key) ?? [];
    ids.push(item._id);
    wishlistKeys.set(key, ids);
  }
  for (const ids of wishlistKeys.values()) {
    if (ids.length > 1)
      for (const id of ids) issue("wishlists", id, "WISHLIST_DUPLICATE", ["user_id", "product_id"]);
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
  const mappedOrders = new Map();
  const statusMap = {
    pending: "MENUNGGU_PEMBAYARAN",
    shipped: "DIKIRIM",
    completed: "SELESAI",
    cancelled: "DIBATALKAN",
  };
  for (const raw of orders) {
    const set = {};
    if (!buyerIds.has(String(raw.buyer_id)))
      issue("orders", raw._id, "ORDER_BUYER_REVIEW_REQUIRED", ["buyer_id"]);
    if (statusMap[raw.status]) set.status = statusMap[raw.status];
    if (
      ![raw.item_price, raw.shipping_fee, raw.total_price].every(Number.isSafeInteger) ||
      raw.item_price < 1000 ||
      raw.shipping_fee < 0
    ) {
      issue("orders", raw._id, "ORDER_PRICE_REVIEW_REQUIRED", [
        "item_price",
        "shipping_fee",
        "total_price",
      ]);
      continue;
    }
    if (!raw.product_snapshot) {
      const product = canonicalProducts.get(String(raw.product_id));
      if (!product) {
        issue("orders", raw._id, "PRODUCT_REVIEW_REQUIRED", ["product_id"]);
        continue;
      }
      if (!Number.isSafeInteger(raw.item_price) || raw.item_price < 1000) {
        issue("orders", raw._id, "ORDER_PRICE_REVIEW_REQUIRED", [
          "item_price",
          "shipping_fee",
          "total_price",
        ]);
        continue;
      }
      set.product_snapshot = { ...product, price: raw.item_price };
      set.product_snapshot_source = "legacy-current-product";
    }
    try {
      // Jangan memakai alamat profil terkini atau menebak ongkir/waktu order lama.
      const address = addressInput(raw.address_snapshot);
      if (!isDeepStrictEqual(address, raw.address_snapshot)) set.address_snapshot = address;
      if (!dateValid(raw.expiresAt) || !dateValid(raw.createdAt) || !dateValid(raw.updatedAt)) {
        issue("orders", raw._id, "ORDER_REVIEW_REQUIRED", ["expiresAt", "createdAt", "updatedAt"]);
        continue;
      }
      if (!validPaymentDeadline(raw.createdAt, raw.expiresAt, set.status ?? raw.status)) {
        issue("orders", raw._id, "ORDER_DEADLINE_REVIEW_REQUIRED", ["createdAt", "expiresAt"]);
        continue;
      }
      const candidate = new Order({ ...raw, ...set });
      await candidate.validate();
      const needsProof = [
        "MENUNGGU_VERIFIKASI",
        "PERLU_UNGGAH_ULANG",
        "DIPROSES",
        "DIKIRIM",
        "SELESAI",
      ].includes(candidate.status);
      const paid = ["DIPROSES", "DIKIRIM", "SELESAI"].includes(candidate.status);
      const shipped = ["DIKIRIM", "SELESAI"].includes(candidate.status);
      const fields = [];
      if (needsProof && !candidate.proof) fields.push("proof");
      if (candidate.proof) {
        try {
          await require("node:fs/promises").access(
            require("../services/files").filePath(config, "proofs", candidate.proof.filename),
          );
        } catch {
          fields.push("proof.filename");
        }
      }
      if (paid && !dateValid(raw.verifiedAt)) fields.push("verifiedAt");
      if (
        shipped &&
        (!raw.shipment?.service || !raw.shipment?.number || !dateValid(raw.shipment?.shippedAt))
      )
        fields.push("shipment");
      if (candidate.status === "SELESAI" && !dateValid(raw.receivedAt)) fields.push("receivedAt");
      if (fields.length) {
        issue("orders", raw._id, "PAYMENT_REVIEW_REQUIRED", fields);
        continue;
      }
      if (raw.cancelledAt === undefined) set.cancelledAt = null;
      if (raw.cancellation_reason === undefined) set.cancellation_reason = null;
      mappedOrders.set(String(raw._id), { ...raw, ...set });
      if (Object.keys(set).length) plan.orders.push({ id: raw._id, set });
    } catch (error) {
      if (error.status !== 422 && error.name !== "ValidationError") throw error;
      issue(
        "orders",
        raw._id,
        "ORDER_REVIEW_REQUIRED",
        error.fields ?? Object.keys(error.errors ?? { address_snapshot: true }),
      );
    }
  }
  const reviewKeys = new Map();
  for (const review of reviews) {
    const order = mappedOrders.get(String(review.order_id));
    const fields = [];
    if (!order || order.status !== "SELESAI") fields.push("order_id");
    if (
      !buyerIds.has(String(review.buyer_id)) ||
      !order ||
      String(order.buyer_id) !== String(review.buyer_id)
    )
      fields.push("buyer_id");
    if (!Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5)
      fields.push("rating");
    if (
      typeof review.comment !== "string" ||
      review.comment.trim().length < 10 ||
      review.comment.trim().length > 500 ||
      review.comment !== review.comment.trim()
    )
      fields.push("comment");
    if (!dateValid(review.createdAt)) fields.push("createdAt");
    if (fields.length) issue("reviews", review._id, "REVIEW_REVIEW_REQUIRED", fields);
    const key = String(review.order_id);
    const ids = reviewKeys.get(key) ?? [];
    ids.push(review._id);
    reviewKeys.set(key, ids);
  }
  for (const ids of reviewKeys.values())
    if (ids.length > 1)
      for (const id of ids) issue("reviews", id, "REVIEW_DUPLICATE", ["order_id"]);
  const reserving = [...mappedOrders.values()].filter((order) =>
    RESERVED_STATUSES.includes(order.status),
  );
  for (const product of products) {
    const owner = mappedOrders.get(String(product.reservation_order_id));
    const claims = reserving.filter((order) => String(order.product_id) === String(product._id));
    if (product.status === "reserved") {
      if (
        !product.active ||
        !owner ||
        !RESERVED_STATUSES.includes(owner.status) ||
        String(owner.product_id) !== String(product._id) ||
        claims.length !== 1
      )
        issue("products", product._id, "RESERVATION_REVIEW_REQUIRED", [
          "reservation_order_id",
          "status",
        ]);
    } else if (product.reservation_order_id != null || claims.length) {
      issue("products", product._id, "RESERVATION_REVIEW_REQUIRED", [
        "reservation_order_id",
        "status",
      ]);
    }
  }
  for (const order of reserving) {
    if (!productIds.has(String(order.product_id)))
      issue("orders", order._id, "RESERVATION_REVIEW_REQUIRED", ["product_id"]);
  }
  plan.summary = {
    users: plan.users.length,
    products: plan.products.length,
    orders: plan.orders.length,
    blockers: plan.issues.length,
  };
  return plan;
}

async function assertDataReady(connection, config = {}) {
  const plan = await inspectLegacyData(connection, undefined, config);
  if (plan.issues.length || plan.users.length || plan.products.length || plan.orders.length) {
    throw new DataMigrationRequired();
  }
}

async function migrateLegacyData(connection, apply = false, config = {}) {
  if (!apply) return inspectLegacyData(connection, undefined, config);
  const preview = await inspectLegacyData(connection, undefined, config);
  if (preview.issues.length) throw new DataMigrationRequired();
  // DDL di luar transaksi; perubahan data di bawah tetap seluruhnya atomik.
  await connection.db.collection("users").createIndex({ email: 1 }, { unique: true });
  await connection.db
    .collection("wishlists")
    .createIndex({ user_id: 1, product_id: 1 }, { unique: true });
  await connection.db.collection("reviews").createIndex({ order_id: 1 }, { unique: true });
  const session = await connection.startSession();
  try {
    let applied;
    await session.withTransaction(async () => {
      const plan = await inspectLegacyData(connection, session, config);
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
