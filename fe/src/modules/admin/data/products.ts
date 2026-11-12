import { ApiError } from "@/lib/api";
import { loadProducts, storeProducts } from "@/modules/catalog/data/productStore";
import type { Product } from "@/modules/catalog/types";
import { applyOrderStock } from "@/modules/orders/order";
import { withOrders } from "@/modules/orders/data/orderStore";
import type { ProductInput } from "@/modules/admin/productForm";

/*
 * Pintu admin ke data produk (M1/M2). SEMENTARA membaca dan menulis daftar produk di
 * localStorage lewat productStore; status Dipesan/Terjual dihitung dari pesanan di
 * IndexedDB, sama seperti katalog Buyer. Nanti diganti:
 *   GET /admin/products, POST /admin/products, PATCH /admin/products/:id
 */

export type Demo = string | null;

/** Produk ditambah nomor pesanan yang sedang menguncinya, kalau ada. */
export type AdminProduct = Product & { orderId?: string };

export type AdminStatus = "tersedia" | "dipesan" | "terjual" | "nonaktif";

export function adminStatus(product: Product): AdminStatus {
  if (product.active === false) return "nonaktif";
  if (product.status === "reserved") return "dipesan";
  if (product.status === "sold") return "terjual";
  return "tersedia";
}

const LATENCY = 450;

function later<T>(run: () => T | Promise<T>, ms = LATENCY): Promise<T> {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      Promise.resolve().then(run).then(resolve, reject);
    }, ms),
  );
}

const offline = () =>
  new ApiError(503, "Koneksi ke server terputus. Periksa internetmu, lalu coba lagi.");

/** Status stok dari pesanan aktif, plus nomor pesanannya untuk banner M2.6. */
function withStock(products: Product[]): Promise<AdminProduct[]> {
  if (typeof indexedDB === "undefined") return Promise.resolve(products);
  return withOrders((orders) =>
    products.map((product) => ({
      ...applyOrderStock(product, orders),
      orderId: orders.find((o) => o.product.id === product.id && o.status !== "DIBATALKAN")?.id,
    })),
  );
}

export function listAdminProducts(demo: Demo = null): Promise<AdminProduct[]> {
  if (demo === "memuat") return new Promise(() => {});
  return later(async () => {
    if (demo === "gagal") throw offline();
    if (demo === "kosong") return [];
    const products = await withStock(loadProducts());
    return products.sort((a, b) =>
      (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt),
    );
  });
}

export function getAdminProduct(id: string): Promise<AdminProduct> {
  return later(async () => {
    const [product] = await withStock(loadProducts().filter((p) => p.id === id));
    if (!product) throw new ApiError(404, "Produk ini tidak ada atau sudah dihapus.");
    return product;
  });
}

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "produk"}-${Date.now().toString(36)}`;
}

function persist(products: Product[]) {
  try {
    storeProducts(products);
  } catch {
    throw new ApiError(
      413,
      "Foto terlalu besar untuk disimpan sementara. Kurangi jumlah atau ukuran foto.",
    );
  }
}

/** Tambah produk baru (tanpa `id`) atau simpan perubahan. Barang baru selalu Tersedia. */
export function saveProduct(input: ProductInput, id?: string, demo: Demo = null): Promise<Product> {
  if (demo === "menyimpan") return new Promise(() => {});
  return later(async () => {
    if (demo === "gagal-simpan") throw offline();
    const products = loadProducts();
    const now = new Date().toISOString();

    if (!id) {
      const created: Product = {
        ...input,
        id: slugify(input.name),
        status: "available",
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      persist([created, ...products]);
      return created;
    }

    const [current] = await withStock(products.filter((p) => p.id === id));
    if (!current) throw new ApiError(404, "Produk ini tidak ada atau sudah dihapus.");
    if (current.status === "sold") {
      throw new ApiError(409, "Barang sudah terjual dan tidak bisa diubah.");
    }
    // Barang yang sedang dipesan: harga dan ukuran dikunci, sama seperti di server nanti.
    const locked = current.status === "reserved";
    const { orderId: _orderId, ...stored } = current;
    void _orderId;
    const updated: Product = {
      ...stored,
      ...input,
      price: locked ? current.price : input.price,
      size: locked ? current.size : input.size,
      status: products.find((p) => p.id === id)!.status,
      updatedAt: now,
    };
    persist(products.map((p) => (p.id === id ? updated : p)));
    return updated;
  }, 900);
}

/** Nonaktifkan (sembunyikan dari katalog) atau aktifkan lagi. */
export function setProductActive(id: string, active: boolean): Promise<void> {
  return later(async () => {
    const products = loadProducts();
    const [current] = await withStock(products.filter((p) => p.id === id));
    if (!current) throw new ApiError(404, "Produk ini tidak ada atau sudah dihapus.");
    if (!active && current.status !== "available") {
      throw new ApiError(
        409,
        "Barang yang sedang dipesan atau sudah terjual tidak bisa dinonaktifkan.",
      );
    }
    const now = new Date().toISOString();
    persist(products.map((p) => (p.id === id ? { ...p, active, updatedAt: now } : p)));
  });
}

/** Jumlah pesanan yang menunggu admin, untuk lencana "Pesanan masuk" di sidebar. */
export function countPendingOrders(): Promise<number> {
  if (typeof indexedDB === "undefined") return Promise.resolve(0);
  return withOrders((orders) => orders.filter((o) => o.status === "MENUNGGU_VERIFIKASI").length);
}
