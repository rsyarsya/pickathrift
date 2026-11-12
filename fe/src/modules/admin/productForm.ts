import { formatRupiah, parseRupiah } from "@/lib/format";
import {
  CATEGORIES,
  CONDITIONS,
  SIZES,
  STYLES,
  type Category,
  type Condition,
  type Product,
  type Style,
} from "@/modules/catalog/types";

/** Isian form M2 dalam bentuk teks mentah, sebelum divalidasi. */
export type ProductForm = {
  /** Data URL atau path foto. Indeks 0 = foto utama. */
  images: string[];
  name: string;
  category: Category | "";
  brand: string;
  style: Style | "";
  color: string;
  size: string;
  condition: Condition | "";
  measurements: Record<string, string>;
  price: string;
};

/** Data yang dikirim ke service setelah lolos validasi. */
export type ProductInput = Omit<Product, "id" | "status" | "createdAt" | "updatedAt" | "active">;

export type ProductFormErrors = Partial<Record<string, string>>;

export const MAX_IMAGES = 4;

const TOP_MEASUREMENTS = ["Lebar dada", "Panjang", "Bahu", "Lengan"];
const BOTTOM_MEASUREMENTS = ["Pinggang", "Panjang", "Lebar paha", "Lebar bawah"];
const WAIST_SIZES = ["27", "28", "29", "30", "31", "32", "33", "34", "36"];

/** Celana diukur di pinggang dan paha, atasan di dada dan bahu. */
export function measurementLabels(category: Category | "") {
  return category === "Celana" ? BOTTOM_MEASUREMENTS : TOP_MEASUREMENTS;
}

/** Celana memakai nomor pinggang, atasan memakai XS–XL. */
export function sizeOptions(category: Category | ""): readonly string[] {
  return category === "Celana" ? WAIST_SIZES : SIZES;
}

export const OPTIONS = { categories: CATEGORIES, styles: STYLES, conditions: CONDITIONS };

export function formFromProduct(product?: Product): ProductForm {
  return {
    images: product?.images ?? [],
    name: product?.name ?? "",
    category: product?.category ?? "",
    brand: product?.brand ?? "",
    style: product?.style ?? "",
    color: product?.color ?? "",
    size: product?.size ?? "",
    condition: product?.condition ?? "",
    measurements: Object.fromEntries(
      (product?.measurements ?? []).map((m) => [m.label, String(m.cm)]),
    ),
    price: product ? formatRupiah(product.price) : "",
  };
}

export function validateProductForm(
  form: ProductForm,
): { ok: true; value: ProductInput } | { ok: false; errors: ProductFormErrors } {
  const errors: ProductFormErrors = {};
  const name = form.name.trim();
  const brand = form.brand.trim();
  const price = parseRupiah(form.price);

  if (form.images.length === 0) errors.images = "Tambahkan minimal satu foto utama.";
  if (!name) errors.name = "Nama barang wajib diisi.";
  if (!form.category) errors.category = "Pilih kategori.";
  if (!brand) errors.brand = "Merek wajib diisi. Tanpa merek? Tulis Vintage.";
  if (!form.style) errors.style = "Pilih gaya.";
  if (!form.size) errors.size = "Pilih ukuran label.";
  if (!form.condition) errors.condition = "Pilih kondisi barang.";
  if (price === null) errors.price = "Harga jual wajib diisi.";
  else if (price < 1000) errors.price = "Harga minimal Rp 1.000.";

  const measurements: Product["measurements"] = [];
  for (const label of measurementLabels(form.category)) {
    const raw = form.measurements[label]?.trim() ?? "";
    if (raw === "") continue;
    const cm = Number(raw.replace(",", "."));
    if (!Number.isFinite(cm) || cm <= 0 || cm > 200) {
      errors[`ukuran:${label}`] = "Isi angka 1–200, contoh 56.";
    } else {
      measurements.push({ label, cm });
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      images: form.images,
      name,
      brand,
      category: form.category as Category,
      style: form.style as Style,
      color: form.color.trim(),
      size: form.size,
      condition: form.condition as Condition,
      measurements,
      price: price!,
    },
  };
}
