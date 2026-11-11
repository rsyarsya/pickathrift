import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareScreen } from "@/modules/compare/components/CompareScreen";

export const metadata: Metadata = { title: "Meja Perbandingan" };

export default function ComparePage() {
  return (
    <Suspense>
      <CompareScreen />
    </Suspense>
  );
}
