import { Suspense } from "react";
import { OrderDetailScreen } from "@/modules/orders/components/OrderDetailScreen";

export default async function OrderDetailPage({ params }: PageProps<"/pesanan/[id]">) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <p className="p-16" role="status">
          Memuat detail pesanan…
        </p>
      }
    >
      <OrderDetailScreen id={id} />
    </Suspense>
  );
}
