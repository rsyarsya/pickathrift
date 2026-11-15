import { api, apiData, ApiError } from "@/lib/api";
import { createStore } from "@/lib/store";
import { fromApiOrder, type OrderDto } from "@/modules/orders/data/orderDto";
import type { AdminOrderAction } from "@/modules/admin/orderActions";
import { type Order, type OrderStatus } from "@/modules/orders/order";

export type AdminOrderQuery = { status?: OrderStatus; page?: number; limit?: number };
export type AdminOrderPage = {
  items: Order[];
  total: number;
  counts: Record<OrderStatus, number>;
  page: number;
  limit: number;
  totalPages: number;
};
export const adminOrderRevision = createStore(0);

export async function listAdminOrders(query: AdminOrderQuery = {}): Promise<AdminOrderPage> {
  const page = query.page ?? 1,
    limit = query.limit ?? 20;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (query.status) params.set("status", query.status);
  const result = await api<{ success: true; data: OrderDto[] } & Omit<AdminOrderPage, "items">>(
    `/api/admin/orders?${params}`,
  );
  return {
    items: result.data.map((order) => fromApiOrder(order)),
    total: result.total,
    counts: result.counts,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  };
}

export async function countPendingOrders(): Promise<number> {
  return (await listAdminOrders({ limit: 1 })).counts.MENUNGGU_VERIFIKASI;
}

export async function getAdminOrder(id: string): Promise<Order> {
  try {
    return fromApiOrder(await apiData<OrderDto>(`/api/orders/${encodeURIComponent(id)}`));
  } catch (error) {
    if (error instanceof ApiError && error.status === 422)
      throw new ApiError(404, "Pesanan tidak ditemukan.", error.code);
    throw error;
  }
}

export async function updateAdminOrder(order: Order, action: AdminOrderAction): Promise<Order> {
  if (!Number.isInteger(order.version) || order.version === undefined || order.version < 0)
    throw new ApiError(409, "Muat ulang pesanan sebelum mengambil keputusan.", "STALE_ORDER");
  if (action.type !== "ship" && !order.proof?.id)
    throw new ApiError(
      409,
      "Muat ulang bukti pembayaran sebelum mengambil keputusan.",
      "PROOF_UNAVAILABLE",
    );
  const body =
    action.type === "ship"
      ? {
          version: order.version,
          type: action.type,
          service: action.service,
          number: action.number.trim(),
        }
      : {
          version: order.version,
          type: action.type,
          proofId: order.proof!.id,
          ...(action.type === "approve" ? {} : { note: action.note.trim() }),
        };
  const updated = fromApiOrder(
    await apiData<OrderDto>(`/api/admin/orders/${encodeURIComponent(order.id)}/actions`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
    order.buyerEmail,
  );
  adminOrderRevision.set(adminOrderRevision.get() + 1);
  return updated;
}
