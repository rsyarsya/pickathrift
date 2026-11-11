import {
  CATEGORIES,
  CONDITIONS,
  SIZES,
  type CatalogQuery,
  type Product,
  type SortKey,
} from "@/modules/catalog/types";

/*
 * Filter katalog hidup di URL (?kategori=Jaket&ukuran=M,L), jadi bisa dibagikan dan
 * tombol Back berfungsi. File ini menerjemahkan URL ⇄ CatalogQuery.
 */

const SORTS: SortKey[] = ["terbaru", "termurah", "termahal"];

function pick<T extends string>(allowed: readonly T[], value: string | null): T | undefined {
  return allowed.find((item) => item === value);
}

function pickMany<T extends string>(allowed: readonly T[], value: string | null): T[] {
  if (!value) return [];
  const wanted = value.split(",");
  return allowed.filter((item) => wanted.includes(item));
}

function toNumber(value: string | null): number | undefined {
  if (value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function parseQuery(params: URLSearchParams): CatalogQuery {
  return {
    q: params.get("q")?.trim() || undefined,
    category: pick(CATEGORIES, params.get("kategori")),
    sizes: pickMany(SIZES, params.get("ukuran")),
    conditions: pickMany(CONDITIONS, params.get("kondisi")),
    minPrice: toNumber(params.get("min")),
    maxPrice: toNumber(params.get("max")),
    availableOnly: params.get("tersedia") === "1",
    sort: pick(SORTS, params.get("urut")) ?? "terbaru",
  };
}

export function toSearchParams(query: CatalogQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("kategori", query.category);
  if (query.sizes.length) params.set("ukuran", query.sizes.join(","));
  if (query.conditions.length) params.set("kondisi", query.conditions.join(","));
  if (query.minPrice !== undefined) params.set("min", String(query.minPrice));
  if (query.maxPrice !== undefined) params.set("max", String(query.maxPrice));
  if (query.availableOnly) params.set("tersedia", "1");
  if (query.sort !== "terbaru") params.set("urut", query.sort);
  return params;
}

export const EMPTY_QUERY: CatalogQuery = {
  sizes: [],
  conditions: [],
  availableOnly: false,
  sort: "terbaru",
};

/** Ada filter yang bisa dihapus (selain urutan dan kata kunci). */
export function hasFilters(query: CatalogQuery): boolean {
  return (
    query.category !== undefined ||
    query.sizes.length > 0 ||
    query.conditions.length > 0 ||
    query.minPrice !== undefined ||
    query.maxPrice !== undefined ||
    query.availableOnly
  );
}

/*
 * Penyaringan di sisi klien, dipakai selama data masih fixtures. Begitu backend jadi,
 * parameter yang sama dikirim ke GET /products dan fungsi ini tidak dipakai lagi.
 */
export function applyQuery(products: Product[], query: CatalogQuery): Product[] {
  const q = query.q?.toLowerCase();
  const result = products.filter(
    (p) =>
      (!q || `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(q)) &&
      (!query.category || p.category === query.category) &&
      (query.sizes.length === 0 || query.sizes.some((s) => s === p.size)) &&
      (query.conditions.length === 0 || query.conditions.includes(p.condition)) &&
      (query.minPrice === undefined || p.price >= query.minPrice) &&
      (query.maxPrice === undefined || p.price <= query.maxPrice) &&
      (!query.availableOnly || p.status === "available"),
  );

  const byDate = (a: Product, b: Product) => b.createdAt.localeCompare(a.createdAt);
  const compare = {
    terbaru: byDate,
    termurah: (a: Product, b: Product) => a.price - b.price,
    termahal: (a: Product, b: Product) => b.price - a.price,
  }[query.sort];

  return result.sort(compare);
}
