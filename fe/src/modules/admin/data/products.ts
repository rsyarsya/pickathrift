import { apiData, ApiError } from "@/lib/api";
import { API_URL } from "@/lib/env";
import { imageError } from "@/lib/image";
import { fromApiProduct } from "@/modules/catalog/data/products";
import type { Product, ProductStatus } from "@/modules/catalog/types";
import type { ProductInput } from "@/modules/admin/productForm";

export type AdminProduct = Product;
export type AdminStatus = "tersedia" | "dipesan" | "terjual" | "nonaktif";
export type AdminProductQuery = { status?: ProductStatus; active?: boolean };
type ProductPage = { items: Product[]; totalPages: number };

export function adminStatus(product: Product): AdminStatus {
  if (product.active === false) return "nonaktif";
  if (product.status === "reserved") return "dipesan";
  if (product.status === "sold") return "terjual";
  return "tersedia";
}

export async function listAdminProducts(query: AdminProductQuery = {}): Promise<AdminProduct[]> {
  const params = new URLSearchParams({ page: "1", limit: "100" });
  if (query.status) params.set("status", query.status);
  if (query.active !== undefined) params.set("active", String(query.active));
  const first = await apiData<ProductPage>(`/api/admin/products?${params}`);
  const products = [...first.items];
  for (let page = 2; page <= first.totalPages; page++) {
    params.set("page", String(page));
    products.push(...(await apiData<ProductPage>(`/api/admin/products?${params}`)).items);
  }
  return products.map(fromApiProduct);
}

export async function getAdminProduct(id: string): Promise<AdminProduct> {
  try {
    return fromApiProduct(await apiData<Product>(`/api/admin/products/${encodeURIComponent(id)}`));
  } catch (error) {
    if (error instanceof ApiError && error.status === 422)
      throw new ApiError(404, "Produk tidak ditemukan.", error.code);
    throw error;
  }
}

export async function saveProduct(input: ProductInput, id?: string): Promise<Product> {
  const { name, brand, category, style, color, size, condition, measurements, price, images } =
    input;
  return fromApiProduct(
    await apiData<Product>(id ? `/api/products/${encodeURIComponent(id)}` : "/api/products", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify({
        name,
        brand,
        category,
        style,
        color,
        size,
        condition,
        measurements,
        price,
        images,
      }),
    }),
  );
}

export async function setProductActive(id: string, active: boolean): Promise<void> {
  await apiData<Product>(
    `/api/products/${encodeURIComponent(id)}`,
    active ? { method: "PATCH", body: JSON.stringify({ active: true }) } : { method: "DELETE" },
  );
}

export async function uploadProductImages(files: File[]): Promise<string[]> {
  if (!files.length || files.length > 4) throw new ApiError(422, "Pilih 1 sampai 4 foto produk.");
  for (const file of files) {
    const error = imageError(file);
    if (error) throw new ApiError(422, error);
  }
  const paths: string[] = [];
  // Each image stays below Vercel's 4.5 MB request limit.
  for (const file of files) {
    const body = new FormData();
    body.append("images", file);
    const uploaded = await apiData<string[]>("/api/admin/product-images", { method: "POST", body });
    paths.push(...uploaded.map((path) => new URL(path, API_URL).href));
  }
  return paths;
}
