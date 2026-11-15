import type { Order } from "./order";

export function orderReference(order: Pick<Order, "id">) {
  return `#${order.id.slice(0, 12)}`;
}

export function orderHref(order: Order) {
  return `/pesanan/${encodeURIComponent(order.id)}`;
}

export function reviewHref(order: Order) {
  return `/ulasan?pesanan=${encodeURIComponent(order.id)}`;
}

export function checkoutHref(order: Order) {
  return `/checkout/${encodeURIComponent(order.product.id)}?pesanan=${encodeURIComponent(order.id)}`;
}
