const { expireOrders } = require("./orders");
const Product = require("../models/products");
const { ApiError } = require("../lib/errors");
const { catalogQuery } = require("../lib/catalog-query");
const { CATEGORIES } = require("../lib/product-options");
const serialize = require("../lib/serializers");

async function listProducts(query, admin = false) {
  await expireOrders();
  const { filter, order, page, limit, skip } = catalogQuery(query, admin);
  const [items, total, groups] = await Promise.all([
    Product.find(filter).sort(order).skip(skip).limit(limit),
    Product.countDocuments(filter),
    Product.aggregate([
      { $match: admin ? {} : { active: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
  ]);
  const counts = Object.fromEntries(["Semua", ...CATEGORIES].map((key) => [key, 0]));
  for (const group of groups) {
    counts.Semua += group.count;
    if (CATEGORIES.includes(group._id)) counts[group._id] = group.count;
  }
  return {
    items: items.map(serialize.product),
    total,
    counts,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async function getProduct(id, admin = false) {
  await expireOrders();
  const product = await Product.findOne({ _id: id, ...(admin ? {} : { active: true }) });
  if (!product) throw new ApiError(404, "NOT_FOUND", "Barang tidak ditemukan.");
  return product;
}

async function updateProduct(id, input) {
  const current = await getProduct(id, true);
  if (current.status === "sold")
    throw new ApiError(409, "PRODUCT_LOCKED", "Barang Terjual tidak bisa diubah.");
  if (
    current.status === "reserved" &&
    ((input.price !== undefined && input.price !== current.price) ||
      (input.size !== undefined && input.size !== current.size))
  ) {
    throw new ApiError(409, "PRODUCT_LOCKED", "Harga dan ukuran barang Dipesan tidak bisa diubah.");
  }
  if (
    input.active !== undefined &&
    input.active !== current.active &&
    current.status !== "available"
  ) {
    throw new ApiError(
      409,
      "PRODUCT_LOCKED",
      "Hanya barang Tersedia yang bisa diaktifkan atau dinonaktifkan.",
    );
  }
  const previous = {
    _id: current.id,
    __v: current.__v,
    status: current.status,
    active: current.active,
  };
  current.set(input);
  // Validasi dokumen lengkap agar perubahan kategori juga memeriksa ukuran/pengukuran lama.
  await current.validate();
  const product = await Product.findOneAndUpdate(
    previous,
    { $set: input, $inc: { __v: 1 } },
    { returnDocument: "after", runValidators: true },
  );
  if (!product)
    throw new ApiError(
      409,
      "PRODUCT_CHANGED",
      "Produk berubah saat disimpan. Muat ulang dan coba lagi.",
    );
  return product;
}

module.exports = { listProducts, getProduct, updateProduct };
