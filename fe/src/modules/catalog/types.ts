export const CATEGORIES = ["Jaket", "Kaos", "Kemeja", "Celana"] as const;
export const SIZES = ["XS", "S", "M", "L", "XL"] as const;
export const CONDITIONS = ["Baru dengan tag", "Sangat baik", "Baik", "Memuaskan"] as const;
export const STYLES = ["Kasual", "Workwear", "Vintage", "Formal"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Size = (typeof SIZES)[number];
export type Condition = (typeof CONDITIONS)[number];
export type Style = (typeof STYLES)[number];

/** Setiap produk cuma satu unit. Dipesan = dikunci pesanan yang belum selesai. */
export type ProductStatus = "available" | "reserved" | "sold";

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: Category;
  /** Label ukuran di kartu. Celana memakai nomor pinggang, misalnya "31". */
  size: string;
  condition: Condition;
  style: Style;
  color: string;
  price: number;
  status: ProductStatus;
  images: string[];
  /** Ukuran pakaian dalam cm, diukur terbentang datar. */
  measurements: { label: string; cm: number }[];
  createdAt: string;
  /** Dinonaktifkan admin: hilang dari katalog Buyer. Tidak diisi = aktif. */
  active?: boolean;
  /** Terakhir diubah admin. Tidak diisi = sama dengan createdAt. */
  updatedAt?: string;
};

export type SortKey = "terbaru" | "termurah" | "termahal";

export type CatalogQuery = {
  q?: string;
  category?: Category;
  sizes: Size[];
  conditions: Condition[];
  minPrice?: number;
  maxPrice?: number;
  availableOnly: boolean;
  sort: SortKey;
};

export type CatalogPage = {
  items: Product[];
  total: number;
  /** Jumlah per kategori tanpa filter lain, untuk angka di sidebar. */
  counts: Record<Category | "Semua", number>;
};
