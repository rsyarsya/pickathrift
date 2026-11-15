import type { Metadata } from "next";
import { BuyerRegister } from "@/modules/auth/components/buyer-register";

export const metadata: Metadata = {
  title: "Buat akun",
};

export default function DaftarPage() {
  return <BuyerRegister />;
}
