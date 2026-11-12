import type { Metadata } from "next";
import { ProductFormScreen } from "@/modules/admin/components/ProductFormScreen";

export const metadata: Metadata = { title: "Edit produk · Admin" };

export default async function EditProductPage({ params }: PageProps<"/admin/produk/[id]">) {
  const { id } = await params;
  return <ProductFormScreen id={id} />;
}
