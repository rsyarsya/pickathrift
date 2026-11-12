import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";

/** Layar state sistem X1 yang berdiri sendiri: navbar tanpa footer. */
export default function PlainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
