import { ApiError } from "@/lib/api";
import type { SessionUser } from "@/modules/auth/useSession";
import { getProduct } from "@/modules/catalog/data/products";
import { getOrder, ownedOrder } from "@/modules/orders/data/orders";
import { withOrders } from "@/modules/orders/data/orderStore";
import type { Order } from "@/modules/orders/order";
import { reviewEligibility, validateReview, type PublicReview, type ReviewInput } from "../review";
import { SAMPLE_REVIEWS } from "./fixtures";

const delay = () => new Promise<void>((resolve) => setTimeout(resolve, 450));

export async function listReviews(demo: string | null, email?: string): Promise<PublicReview[]> {
  await delay();
  if (demo === "gagal") throw new ApiError(503, "Ulasan gagal dimuat.");
  const saved = await withOrders((orders) =>
    orders.flatMap((order) =>
      order.status === "SELESAI" &&
      order.review &&
      (!email || order.buyerEmail === email.toLowerCase())
        ? [{ ...order.review, id: order.id, product: order.product }]
        : [],
    ),
  );
  if (email) return saved.sort((a, b) => b.createdAt - a.createdAt);

  const now = Date.now();
  const sample = await Promise.all(
    SAMPLE_REVIEWS.map(async ({ productId, daysAgo, ...review }) => ({
      ...review,
      id: `sample-${productId}`,
      createdAt: now - daysAgo * 86_400_000,
      product: await getProduct(productId, { includeOrderStock: false }),
    })),
  );
  return [...saved, ...sample].sort((a, b) => b.createdAt - a.createdAt);
}

export const REVIEW_DEMOS = ["tulis", "validasi", "terkirim", "terkunci"];

export async function getReviewOrder(id: string | null, email: string, demo: string | null) {
  if (demo && REVIEW_DEMOS.includes(demo)) {
    const locked = demo === "terkunci";
    const order = await getOrder(
      id ?? (locked ? "PCT-005" : "PCT-004"),
      email,
      locked ? "dikirim" : "selesai",
    );
    if (order.demo && demo === "terkirim") {
      const { author, rating, body } = SAMPLE_REVIEWS[0];
      return { ...order, review: { author, rating, body, createdAt: Date.now() } };
    }
    return order;
  }
  if (!id) throw new ApiError(404, "Pesanan tidak ditemukan.");
  return getOrder(id, email, demo);
}

export async function submitReview(order: Order, user: SessionUser, input: ReviewInput) {
  await delay();
  if (Object.keys(validateReview(input)).length)
    throw new ApiError(422, "Periksa bintang dan isi ulasan.");

  function addReview(current: Order, now: number): Order {
    const eligibility = reviewEligibility(current);
    if (eligibility === "sent") return current;
    if (eligibility === "locked") throw new ApiError(409, "Ulasan dibuka setelah pesanan selesai.");
    return {
      ...current,
      review: {
        rating: input.rating,
        body: input.body.trim(),
        author: user.name.trim().split(/\s+/)[0] || "Buyer",
        createdAt: now,
      },
    };
  }

  if (order.demo) return addReview(order, Date.now());
  return withOrders((orders, save, now) => {
    const current = ownedOrder(orders, order.id, user.email);
    const updated = addReview(current, now);
    if (updated !== current) save(updated);
    return updated;
  });
}
