export const CATEGORIES = ["Jaket", "Kaos", "Kemeja", "Celana"] as const;
export const SIZES = ["XS", "S", "M", "L", "XL"] as const;
export const CONDITIONS = ["Baru dengan tag", "Sangat baik", "Baik", "Memuaskan"] as const;
export const STYLES = ["Kasual", "Workwear", "Vintage", "Formal"] as const;

export type Category = (typeof CATEGORIES)[number];
/** Celana memakai nomor pinggang, bukan XS–XL. */
export const WAIST_SIZES = ["27", "28", "29", "30", "31", "32", "33", "34", "36"] as const;
export const ALL_SIZES = [...SIZES, ...WAIST_SIZES] as const;
export const TOP_MEASUREMENTS = ["Lebar dada", "Panjang", "Bahu", "Lengan"] as const;
export const BOTTOM_MEASUREMENTS = ["Pinggang", "Panjang", "Lebar paha", "Lebar bawah"] as const;

export type Size = (typeof ALL_SIZES)[number];

/** Pilihan ukuran yang masuk akal untuk kategori. Tanpa kategori: semua. */
export function sizesFor(category?: Category | ""): readonly Size[] {
  if (category === "Celana") return WAIST_SIZES;
  return category ? SIZES : ALL_SIZES;
}
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
