import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderHistoryScreen } from "@/modules/orders/components/OrderHistoryScreen";

export const metadata: Metadata = { title: "Pesanan saya" };

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
