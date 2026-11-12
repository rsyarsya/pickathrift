import type { Metadata } from "next";
import { ProductListScreen } from "@/modules/admin/components/ProductListScreen";

export const metadata: Metadata = { title: "Kelola produk · Admin" };

export default function AdminProductsPage() {
  return <ProductListScreen />;
}
