import { Suspense } from "react";
import { OrderHistoryScreen } from "@/modules/orders/components/OrderHistoryScreen";

export default function OrderHistoryPage() {
  return (
    <Suspense
      fallback={
        <p className="p-16" role="status">
          Memuat pesanan…
        </p>
      }
    >
      <OrderHistoryScreen />
    </Suspense>
  );
}
