import { apiData, ApiError } from "@/lib/api";
import { listOrders } from "@/modules/orders/data/orders";
import { fromApiReview, type ReviewDto } from "@/modules/orders/data/orderDto";
import type { Order } from "@/modules/orders/order";
import { validateReview, type PublicReview, type ReviewInput } from "../review";

export async function listReviews(email?: string): Promise<PublicReview[]> {
  if (email) {
    const orders = await listOrders(email);
    return orders
      .flatMap((order) =>
        order.status === "SELESAI" && order.review
          ? [{ ...order.review, id: order.id, product: order.product }]
          : [],
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }
  return (await apiData<ReviewDto[]>("/api/reviews")).map((dto) => ({
    ...fromApiReview(dto),
    id: dto.id,
  }));
}

export async function submitReview(order: Order, input: ReviewInput): Promise<Order> {
  if (Object.keys(validateReview(input)).length)
    throw new ApiError(422, "Periksa bintang dan isi ulasan.");
  const dto = await apiData<ReviewDto>(`/api/orders/${encodeURIComponent(order.id)}/review`, {
    method: "POST",
    body: JSON.stringify({ rating: input.rating, comment: input.body.trim() }),
  });
  return { ...order, review: fromApiReview(dto) };
}
