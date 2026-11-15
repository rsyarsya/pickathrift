// Data fiktif mengikuti ProductInput FE, bukan data akun/database tim.
function productInput(overrides = {}) {
  return {
    name: "Work jacket olive",
    brand: "Vintage",
    category: "Jaket",
    size: "M",
    condition: "Baik",
    style: "Kasual",
    color: "Olive",
    price: 75000,
    images: ["/images/products/jacket-qa.jpg"],
    measurements: [
      { label: "Lebar dada", cm: 54 },
      { label: "Panjang", cm: 67 },
    ],
    ...overrides,
  };
}

const addressInput = () => ({
  recipient: "Buyer QA",
  phone: "081234567890",
  street: "Jl. Uji 1",
  city: "Yogyakarta",
  postalCode: "55281",
});
function orderInput(product, overrides = {}) {
  const createdAt = new Date();
  return {
    product_snapshot: require("../lib/serializers").product(product),
    address_snapshot: addressInput(),
    item_price: product.price,
    shipping_fee: 15000,
    total_price: product.price + 15000,
    createdAt,
    expiresAt: new Date(createdAt.getTime() + 21600000),
    ...overrides,
  };
}
module.exports = { productInput, addressInput, orderInput };
