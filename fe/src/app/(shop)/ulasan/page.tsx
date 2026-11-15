import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewsScreen } from "@/modules/reviews/components/ReviewsScreen";

export const metadata: Metadata = { title: "Ulasan" };

export default function ReviewsPage() {
  return (
    <Suspense
      fallback={
        <p className="p-16" role="status">
          Memuat ulasan…
        </p>
      }
    >
      <ReviewsScreen />
    </Suspense>
  );
}
