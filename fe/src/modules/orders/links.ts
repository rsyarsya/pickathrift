import type { Order } from "./order";

export function orderReference(order: Pick<Order, "id">) {
  const reference = /^[a-f\d]{24}$/i.test(order.id) ? order.id.slice(-12).toUpperCase() : order.id;
  return `#${reference}`;
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
