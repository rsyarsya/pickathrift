import { Suspense } from "react";
import { ProductDetailScreen } from "@/modules/product/components/ProductDetailScreen";

export default async function ProductPage({ params }: PageProps<"/produk/[id]">) {
  const { id } = await params;
  return (
    <Suspense>
      <ProductDetailScreen id={id} />
    </Suspense>
  );
}
