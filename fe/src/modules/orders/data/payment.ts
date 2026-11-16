import { apiData, ApiError } from "@/lib/api";
import type { Order } from "../order";
import { fromApiOrder, type OrderDto } from "./orderDto";

type PaymentSession = {
  provider: "midtrans";
  status: "ready" | "pending";
  merchantOrderId: string;
  redirectUrl: string;
  expiresAt: string;
  sessionExpiresAt: string;
};

export async function createPaymentSession(order: Order): Promise<PaymentSession> {
  const session = await apiData<PaymentSession>(
    `/api/orders/${encodeURIComponent(order.id)}/payment`,
    {
      method: "POST",
      body: "{}",
      cache: "no-store",
    },
  );
  let url: URL;
  try {
    url = new URL(session.redirectUrl);
  } catch {
    throw new ApiError(502, "Tautan pembayaran tidak valid. Periksa status pesanan.");
  }
  if (
    session.provider !== "midtrans" ||
    !["ready", "pending"].includes(session.status) ||
    session.merchantOrderId !== order.payment?.merchantOrderId ||
    url.origin !== "https://app.sandbox.midtrans.com" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !/^\/snap\/v\d+\/redirection\/[a-f\d-]{36}$/i.test(url.pathname) ||
    !Number.isFinite(Date.parse(session.expiresAt)) ||
    Date.parse(session.expiresAt) <= Date.now() ||
    Date.parse(session.expiresAt) > order.expiresAt ||
    !Number.isFinite(Date.parse(session.sessionExpiresAt)) ||
    Date.parse(session.sessionExpiresAt) > Date.parse(session.expiresAt) ||
    Date.parse(session.sessionExpiresAt) <= Date.now()
  )
    throw new ApiError(
      502,
      "Tautan pembayaran tidak valid atau sudah berakhir. Periksa status pesanan.",
    );
  return session;
}

export async function syncPayment(order: Order, signal?: AbortSignal) {
  const dto = await apiData<OrderDto>(`/api/orders/${encodeURIComponent(order.id)}/payment/sync`, {
    method: "POST",
    body: "{}",
    cache: "no-store",
    signal,
  });
  return fromApiOrder(dto, order.buyerEmail);
}
