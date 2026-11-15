import { apiData, ApiError } from "@/lib/api";
import { API_URL } from "@/lib/env";
import { toApiSearchParams } from "@/modules/catalog/query";
import type { CatalogPage, CatalogQuery, Product } from "@/modules/catalog/types";
import { criteriaToRequest, type Criteria, type Match } from "@/modules/match/criteria";

export function fromApiProduct(product: Product): Product {
  return {
    ...product,
    images: product.images.map((url) =>
      url.startsWith("/uploads/products/") ? new URL(url, API_URL).href : url,
    ),
  };
}

export async function listProducts(query: CatalogQuery, limit: number): Promise<CatalogPage> {
  const requested = Math.max(1, Math.floor(limit));
  const pageSize = Math.min(requested, 100);
  const first = await apiData<CatalogPage>(`/api/products?${toApiSearchParams(query, pageSize)}`);
  const pages = await Promise.all(
    Array.from({ length: Math.ceil(Math.min(requested, first.total) / pageSize) - 1 }, (_, i) =>
      apiData<CatalogPage>(`/api/products?${toApiSearchParams(query, pageSize, i + 2)}`),
    ),
  );
  return {
    ...first,
    items: [first, ...pages]
      .flatMap((page) => page.items)
      .slice(0, requested)
      .map(fromApiProduct),
  };
}

export async function getProduct(id: string): Promise<Product> {
  try {
    return fromApiProduct(await apiData<Product>(`/api/products/${encodeURIComponent(id)}`));
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) {
      throw new ApiError(404, "Barang ini tidak ada atau sudah dihapus.", error.code, error.errors);
    }
    throw error;
  }
}

/** Barang untuk meja perbandingan, urut sesuai `ids`. Yang sudah dihapus dilewati. */
export async function listProductsByIds(ids: string[]): Promise<Product[]> {
  const products = await Promise.all(
    ids.map(async (id) => {
      try {
        return await getProduct(id);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    }),
  );
  return products.filter((product): product is Product => product !== null);
}

/** Cari yang Cocok (B4). */
export async function findMatches(criteria: Criteria): Promise<Match[]> {
  const matches = await apiData<Match[]>("/api/products/match", {
    method: "POST",
    body: JSON.stringify(criteriaToRequest(criteria)),
  });
  return matches.map((match) => ({ ...match, product: fromApiProduct(match.product) }));
}
