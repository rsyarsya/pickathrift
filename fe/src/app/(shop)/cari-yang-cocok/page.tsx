import type { Metadata } from "next";
import { Suspense } from "react";
import { MatchScreen } from "@/modules/match/components/MatchScreen";

export const metadata: Metadata = { title: "Cari yang Cocok" };

export default function MatchPage() {
  return (
    <Suspense>
      <MatchScreen />
    </Suspense>
  );
}
