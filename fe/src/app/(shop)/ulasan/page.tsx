import { Suspense } from "react";
import { ReviewsScreen } from "@/modules/reviews/components/ReviewsScreen";

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
