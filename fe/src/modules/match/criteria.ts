import { formatRupiah, parseRupiah } from "@/lib/format";
import {
  CATEGORIES,
  STYLES,
  sizesFor,
  type Category,
  type Product,
  type Size,
  type Style,
} from "@/modules/catalog/types";

/*
 * Cari yang Cocok (B4). Kriteria hidup di URL seperti filter katalog:
 * /cari-yang-cocok?jenis=Jaket&gaya=Workwear&ukuran=L&min=100000&max=200000&dada=58&cari=1
 * `cari=1` berarti tampilkan hasil; tanpa itu form ditampilkan dengan isian yang sama.
 */

/** Batas selisih per ukuran, dalam cm. */
export const TOLERANCE_CM = 2;

const ALL_FIELDS = [
  { key: "dada", label: "Lebar dada", short: "Dada" },
  { key: "pinggang", label: "Pinggang", short: "Pinggang" },
  { key: "panjang", label: "Panjang", short: "Panjang" },
  { key: "bahu", label: "Bahu", short: "Bahu" },
  { key: "paha", label: "Lebar paha", short: "Paha" },
] as const;
export type BodyKey = (typeof ALL_FIELDS)[number]["key"];
type BodyField = (typeof ALL_FIELDS)[number];

const TOP_KEYS: BodyKey[] = ["dada", "panjang", "bahu"];
const BOTTOM_KEYS: BodyKey[] = ["pinggang", "panjang", "paha"];

/** Kolom ukuran untuk kategori: celana diukur di pinggang dan paha, atasan di dada dan bahu. */
export function bodyFields(category?: Category): BodyField[] {
  const keys = category === "Celana" ? BOTTOM_KEYS : TOP_KEYS;
  return keys.map((key) => ALL_FIELDS.find((f) => f.key === key)!);
}

export type Criteria = {
  category?: Category;
  style?: Style;
  size?: Size;
  minPrice?: number;
  maxPrice?: number;
  body: Partial<Record<BodyKey, number>>;
};

/** Isian mentah form, sebelum divalidasi. */
export type CriteriaForm = {
  category?: Category;
  style?: Style;
  size?: Size;
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
  const category = pick(CATEGORIES, params.get("jenis"));
  return {
    category,
    style: pick(STYLES, params.get("gaya")),
    size: category ? pick(sizesFor(category), params.get("ukuran")) : undefined,
    min: money("min"),
    max: money("max"),
    body: Object.fromEntries(ALL_FIELDS.map((f) => [f.key, params.get(f.key) ?? ""])) as Record<
      BodyKey,
      string
    >,
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

  // Hanya kolom milik kategori terpilih; isian kategori sebelumnya diabaikan (QA-003).
  const body: Criteria["body"] = {};
  for (const { key } of bodyFields(form.category)) {
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
      size: form.size && sizesFor(form.category).includes(form.size) ? form.size : undefined,
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
  for (const { key } of ALL_FIELDS) {
    const cm = criteria.body[key];
    if (cm !== undefined) params.set(key, String(cm));
  }
  return params;
}

export type Match = { product: Product; diffCm: number };

/** Body API hanya berisi filter yang didukung dan pengukuran kategori terpilih. */
export function criteriaToRequest(criteria: Criteria) {
  return {
    category: criteria.category,
    style: criteria.style,
    size: criteria.size,
    minPrice: criteria.minPrice,
    maxPrice: criteria.maxPrice,
    measurements: bodyFields(criteria.category).flatMap(({ key, label }) => {
      const cm = criteria.body[key];
      return cm === undefined ? [] : [{ label, cm }];
    }),
  };
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
  const body = ALL_FIELDS.filter((f) => criteria.body[f.key] !== undefined).map(
    (f) => `${f.short} ${criteria.body[f.key]}`,
  );
  if (body.length) chips.push(body.join(" · "));
  return chips;
}
