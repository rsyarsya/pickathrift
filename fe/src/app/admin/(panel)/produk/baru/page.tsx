import type { Metadata } from "next";
import { ProductFormScreen } from "@/modules/admin/components/ProductFormScreen";

export const metadata: Metadata = { title: "Tambah produk · Admin" };

export default function NewProductPage() {
  return <ProductFormScreen />;
}
