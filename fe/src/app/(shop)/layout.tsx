import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { OfflineGate } from "@/components/layout/OfflineGate";

/** Kerangka layar Buyer B1–B5 dan B7–B9: navbar, isi, footer. Checkout (B6) tanpa footer. */
export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="flex-1">
        <OfflineGate>{children}</OfflineGate>
      </main>
      <Footer />
    </div>
  );
}
