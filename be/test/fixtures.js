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

module.exports = { productInput };
