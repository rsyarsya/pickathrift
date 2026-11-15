import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductDetailScreen } from "@/modules/product/components/ProductDetailScreen";

export const metadata: Metadata = { title: "Detail produk" };

export default async function ProductPage({ params }: PageProps<"/produk/[id]">) {
  const { id } = await params;
  return (
    <Suspense>
      <ProductDetailScreen id={id} />
    </Suspense>
  );
}
