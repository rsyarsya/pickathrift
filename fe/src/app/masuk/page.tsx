import type { Metadata } from "next";
import { BuyerLogin } from "@/modules/auth/components/buyer-login";

export const metadata: Metadata = {
  title: "Masuk | PickaThrift",
};

export default function MasukPage() {
  return <BuyerLogin />;
}
