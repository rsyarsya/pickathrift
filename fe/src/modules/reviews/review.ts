import type { Order } from "@/modules/orders/order";

export const RATINGS = [1, 2, 3, 4, 5] as const;
export const MIN_REVIEW_LENGTH = 10;
export const MAX_REVIEW_LENGTH = 500;

export type Review = NonNullable<Order["review"]>;
export type PublicReview = Review & {
  id: string;
  product: Pick<Order["product"], "id" | "name" | "images">;
};
export type ReviewInput = { rating: number; body: string };

export function reviewEligibility(order: Pick<Order, "status" | "review">) {
  if (order.status !== "SELESAI") return "locked";
  return order.review ? "sent" : "ready";
}

export function validateReview({ rating, body }: ReviewInput) {
  const errors: Partial<Record<keyof ReviewInput, string>> = {};
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.rating = "Pilih bintang dulu.";
  const missing = MIN_REVIEW_LENGTH - body.trim().length;
  if (missing > 0) errors.body = `Minimal ${MIN_REVIEW_LENGTH} karakter. Kurang ${missing} lagi.`;
  if (body.length > MAX_REVIEW_LENGTH) errors.body = `Maksimal ${MAX_REVIEW_LENGTH} karakter.`;
  return errors;
}

export function ratingSummary(reviews: Pick<Review, "rating">[]) {
  const total = reviews.length;
  const average = total ? reviews.reduce((sum, review) => sum + review.rating, 0) / total : 0;
  const distribution = [...RATINGS].reverse().map((rating) => ({
    rating,
    percent: total
      ? Math.round((reviews.filter((review) => review.rating === rating).length / total) * 100)
      : 0,
  }));
  return { total, average, distribution };
}
