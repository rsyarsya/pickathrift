import type { Order } from "./order";

export function orderReference(order: Pick<Order, "id">) {
  return `#${order.id.slice(0, 12)}`;
}

export function orderHref(order: Order) {
  const demo =
    order.status === "SELESAI"
      ? "selesai"
      : order.status === "DIBATALKAN"
        ? "dibatalkan"
        : order.status === "DIKIRIM"
          ? "dikirim"
          : order.status === "DIPROSES"
            ? "diproses"
            : "riwayat";
  return `/pesanan/${encodeURIComponent(order.id)}${order.demo ? `?demo=${demo}` : ""}`;
}

export function reviewHref(order: Order) {
  return `/ulasan?pesanan=${encodeURIComponent(order.id)}${order.demo ? "&demo=tulis" : ""}`;
}

export function checkoutHref(order: Order) {
  const demo =
    order.status === "PERLU_UNGGAH_ULANG"
      ? "unggah-ulang"
      : order.status === "MENUNGGU_VERIFIKASI"
        ? "verifikasi"
        : "bayar";
  return `/checkout/${encodeURIComponent(order.product.id)}${order.demo ? `?demo=${demo}` : ""}`;
}
