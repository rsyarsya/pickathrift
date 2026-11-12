import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { OfflineGate } from "@/components/layout/OfflineGate";

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <div data-checkout-layout className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="flex-1">
        <OfflineGate>{children}</OfflineGate>
      </main>
    </div>
  );
}
