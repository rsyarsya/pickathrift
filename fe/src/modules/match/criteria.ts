import { formatRupiah, parseRupiah } from "@/lib/format";
import {
  CATEGORIES,
  STYLES,
  type Category,
  type Product,
  type Style,
} from "@/modules/catalog/types";

/*
 * Cari yang Cocok (B4). Kriteria hidup di URL seperti filter katalog:
 * /cari-yang-cocok?jenis=Jaket&gaya=Workwear&ukuran=L&min=100000&max=200000&dada=58&cari=1
 * `cari=1` berarti tampilkan hasil; tanpa itu form ditampilkan dengan isian yang sama.
 */

export const LABEL_SIZES = ["S", "M", "L", "XL"] as const;
export type LabelSize = (typeof LABEL_SIZES)[number];

/** Batas selisih per ukuran, dalam cm. */
export const TOLERANCE_CM = 2;

export const BODY_FIELDS = [
  { key: "dada", label: "Lebar dada", short: "Dada" },
  { key: "panjang", label: "Panjang", short: "Panjang" },
  { key: "bahu", label: "Bahu", short: "Bahu" },
] as const;
export type BodyKey = (typeof BODY_FIELDS)[number]["key"];

export type Criteria = {
  category?: Category;
  style?: Style;
  size?: LabelSize;
  minPrice?: number;
  maxPrice?: number;
  body: Partial<Record<BodyKey, number>>;
};

/** Isian mentah form, sebelum divalidasi. */
export type CriteriaForm = {
  category?: Category;
  style?: Style;
  size?: LabelSize;
  min: string;
  max: string;
  body: Record<BodyKey, string>;
};

export type CriteriaErrors = Partial<Record<"category" | "min" | "max" | BodyKey, string>>;

function pick<T extends string>(allowed: readonly T[], value: string | null): T | undefined {
  return allowed.find((x) => x === value);
}

export function formFromParams(params: URLSearchParams): CriteriaForm {
  const money = (key: string) => {
    const n = parseRupiah(params.get(key) ?? "");
    return n === null ? "" : formatRupiah(n);
  };
  return {
    category: pick(CATEGORIES, params.get("jenis")),
    style: pick(STYLES, params.get("gaya")),
    size: pick(LABEL_SIZES, params.get("ukuran")),
    min: money("min"),
    max: money("max"),
    body: {
      dada: params.get("dada") ?? "",
      panjang: params.get("panjang") ?? "",
      bahu: params.get("bahu") ?? "",
    },
  };
}

/** Validasi form. Mengembalikan kriteria kalau lolos, atau daftar galat per kolom. */
export function validate(
  form: CriteriaForm,
): { ok: true; criteria: Criteria } | { ok: false; errors: CriteriaErrors } {
  const errors: CriteriaErrors = {};
  if (!form.category) errors.category = "Pilih jenis pakaian dulu.";

  const min = parseRupiah(form.min) ?? undefined;
  const max = parseRupiah(form.max) ?? undefined;
  if (min !== undefined && max !== undefined && min > max) {
    errors.min = "Lebih besar dari maksimum.";
  }

  const body: Criteria["body"] = {};
  for (const { key } of BODY_FIELDS) {
    const raw = form.body[key].trim();
    if (raw === "") continue;
    const cm = Number(raw.replace(",", "."));
    if (!Number.isFinite(cm)) errors[key] = "Isi angka, contoh 56.";
    else if (cm < 20 || cm > 150) errors[key] = "Antara 20 dan 150 cm.";
    else body[key] = cm;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    criteria: {
      category: form.category,
      style: form.style,
      size: form.size,
      minPrice: min,
      maxPrice: max,
      body,
    },
  };
}

export function criteriaToParams(criteria: Criteria): URLSearchParams {
  const params = new URLSearchParams();
  if (criteria.category) params.set("jenis", criteria.category);
  if (criteria.style) params.set("gaya", criteria.style);
  if (criteria.size) params.set("ukuran", criteria.size);
  if (criteria.minPrice !== undefined) params.set("min", String(criteria.minPrice));
  if (criteria.maxPrice !== undefined) params.set("max", String(criteria.maxPrice));
  for (const { key } of BODY_FIELDS) {
    const cm = criteria.body[key];
    if (cm !== undefined) params.set(key, String(cm));
  }
  return params;
}

export type Match = { product: Product; diffCm?: number };

const MEASURE_LABEL: Record<BodyKey, string> = {
  dada: "Lebar dada",
  panjang: "Panjang",
  bahu: "Bahu",
};

/*
 * Pencocokan di sisi klien selama data masih fixtures. Barang terjual tidak ikut.
 * Setiap ukuran yang diisi harus selisih ≤ TOLERANCE_CM; hasil diurutkan dari total
 * selisih terkecil. Nanti diganti POST /products/match di backend.
 */
export function matchProducts(products: Product[], criteria: Criteria): Match[] {
  const entries = Object.entries(criteria.body) as [BodyKey, number][];

  const matches: Match[] = [];
  for (const product of products) {
    if (product.status === "sold") continue;
    if (criteria.category && product.category !== criteria.category) continue;
    if (criteria.style && product.style !== criteria.style) continue;
    if (criteria.size && product.size !== criteria.size) continue;
    if (criteria.minPrice !== undefined && product.price < criteria.minPrice) continue;
    if (criteria.maxPrice !== undefined && product.price > criteria.maxPrice) continue;

    if (entries.length === 0) {
      matches.push({ product });
      continue;
    }
    let total = 0;
    let fits = true;
    for (const [key, cm] of entries) {
      const actual = product.measurements.find((m) => m.label === MEASURE_LABEL[key])?.cm;
      const diff = actual === undefined ? Infinity : Math.abs(actual - cm);
      if (diff > TOLERANCE_CM) fits = false;
      total += diff;
    }
    if (fits) matches.push({ product, diffCm: total });
  }

  return matches.sort((a, b) => (a.diffCm ?? 0) - (b.diffCm ?? 0));
}

/** Teks chip kriteria di layar hasil (B4.4). */
export function criteriaChips(criteria: Criteria): string[] {
  const chips: string[] = [];
  if (criteria.category) chips.push(criteria.category);
  if (criteria.style) chips.push(criteria.style);
  if (criteria.size) chips.push(criteria.size);
  if (criteria.minPrice !== undefined || criteria.maxPrice !== undefined) {
    const k = (n?: number) => (n === undefined ? "…" : String(Math.round(n / 1000)));
    chips.push(`Rp ${k(criteria.minPrice ?? 0)}–${k(criteria.maxPrice)} rb`);
  }
  const body = BODY_FIELDS.filter((f) => criteria.body[f.key] !== undefined).map(
    (f) => `${f.short} ${criteria.body[f.key]}`,
  );
  if (body.length) chips.push(body.join(" · "));
  return chips;
}
