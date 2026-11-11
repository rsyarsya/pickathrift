import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogScreen } from "@/modules/catalog/components/CatalogScreen";

export const metadata: Metadata = { title: "Katalog" };

// CatalogScreen membaca filter dari URL, jadi perlu batas Suspense.
export default function CatalogPage() {
  return (
    <Suspense>
      <CatalogScreen />
    </Suspense>
  );
}
