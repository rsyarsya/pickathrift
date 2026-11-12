import type { Metadata } from "next";
import { OrderDetailScreen } from "@/modules/admin/components/OrderDetailScreen";

export const metadata: Metadata = { title: "Detail pesanan · Admin" };

export default async function AdminOrderPage({ params }: PageProps<"/admin/pesanan/[id]">) {
  const { id } = await params;
  return <OrderDetailScreen id={decodeURIComponent(id)} />;
}
