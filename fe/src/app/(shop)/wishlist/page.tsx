import type { Metadata } from "next";
import { Suspense } from "react";
import { WishlistScreen } from "@/modules/wishlist/components/WishlistScreen";

export const metadata: Metadata = { title: "Wishlist" };

export default function WishlistPage() {
  return (
    <Suspense>
      <WishlistScreen />
    </Suspense>
  );
}
