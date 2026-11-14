const { URL } = require("node:url");

const CATEGORIES = ["Jaket", "Kaos", "Kemeja", "Celana"];
const TOP_SIZES = ["XS", "S", "M", "L", "XL"];
const WAIST_SIZES = ["27", "28", "29", "30", "31", "32", "33", "34", "36"];
const CONDITIONS = ["Baru dengan tag", "Sangat baik", "Baik", "Memuaskan"];
const STYLES = ["Kasual", "Workwear", "Vintage", "Formal"];
const STATUSES = ["available", "reserved", "sold"];
const TOP_MEASUREMENTS = ["Lebar dada", "Panjang", "Bahu", "Lengan"];
const BOTTOM_MEASUREMENTS = ["Pinggang", "Panjang", "Lebar paha", "Lebar bawah"];
const sizesFor = (category) => (category === "Celana" ? WAIST_SIZES : TOP_SIZES);
const measurementsFor = (category) =>
  category === "Celana" ? BOTTOM_MEASUREMENTS : TOP_MEASUREMENTS;

function isImageReference(value) {
  if (typeof value !== "string" || !value || value.length > 2000 || /[\s\\]/.test(value))
    return false;
  if (value.startsWith("/") && !value.startsWith("//")) {
    return !value.split(/[/?#]/).some((part) => part === "." || part === "..");
  }
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

module.exports = {
  CATEGORIES,
  TOP_SIZES,
  WAIST_SIZES,
  CONDITIONS,
  STYLES,
  STATUSES,
  sizesFor,
  measurementsFor,
  isImageReference,
};
