import type { Metadata } from "next";
import { OrderListScreen } from "@/modules/admin/components/OrderListScreen";

export const metadata: Metadata = { title: "Pesanan masuk · Admin" };

export default function AdminOrdersPage() {
  return <OrderListScreen />;
}
