import type { Metadata } from "next";
import { AdminLogin } from "@/modules/auth/components/admin-login";

export const metadata: Metadata = {
  title: "Masuk admin | PickaThrift",
};

export default function AdminMasukPage() {
  return <AdminLogin />;
}
