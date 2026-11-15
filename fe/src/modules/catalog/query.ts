import {
  CATEGORIES,
  CONDITIONS,
  ALL_SIZES,
  type CatalogQuery,
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
    sizes: pickMany(ALL_SIZES, params.get("ukuran")),
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

/** Nama parameter API berbeda dari URL halaman katalog. */
export function toApiSearchParams(query: CatalogQuery, limit: number, page = 1): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.category) params.set("category", query.category);
  if (query.sizes.length) params.set("sizes", query.sizes.join(","));
  if (query.conditions.length) params.set("conditions", query.conditions.join(","));
  if (query.minPrice !== undefined) params.set("minPrice", String(query.minPrice));
  if (query.maxPrice !== undefined) params.set("maxPrice", String(query.maxPrice));
  if (query.availableOnly) params.set("availableOnly", "true");
  params.set("sort", query.sort);
  params.set("page", String(page));
  params.set("limit", String(Math.min(100, Math.max(1, Math.floor(limit)))));
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
