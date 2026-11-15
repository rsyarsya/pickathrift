import { apiBlob, apiData, ApiError } from "@/lib/api";
import { PROOF_TYPES, validateProof, type Order } from "../order";
import { fromApiOrder, type OrderDto } from "./orderDto";

export async function listOrders(email: string): Promise<Order[]> {
  const orders = await apiData<OrderDto[]>("/api/orders/my");
  return orders
    .map((order) => fromApiOrder(order, email))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getOrder(id: string, email: string): Promise<Order> {
  try {
    return fromApiOrder(await apiData<OrderDto>(`/api/orders/${encodeURIComponent(id)}`), email);
  } catch (error) {
    if (error instanceof ApiError && error.status === 422)
      throw new ApiError(404, "Pesanan tidak ditemukan.", error.code);
    throw error;
  }
}

type BuyerAction = { type: "cancel" } | { type: "receive" } | { type: "upload"; file: File };

export async function updateBuyerOrder(order: Order, action: BuyerAction): Promise<Order> {
  if (action.type === "upload") {
    const error = validateProof(action.file);
    if (error) throw new ApiError(422, error);
    if (!(await canDecode(action.file)))
      throw new ApiError(
        422,
        "Gambar tidak bisa dibuka. Pilih file JPG atau PNG yang tidak rusak.",
      );
  }
  const path = `/api/orders/${encodeURIComponent(order.id)}`;
  let dto: OrderDto;
  if (action.type === "upload") {
    const body = new FormData();
    body.set("file", action.file);
    dto = await apiData<OrderDto>(`${path}/payment-proof`, { method: "POST", body });
  } else {
    dto = await apiData<OrderDto>(`${path}/${action.type}`, { method: "POST", body: "{}" });
  }
  return fromApiOrder(dto, order.buyerEmail);
}

export async function loadPaymentProof(orderId: string): Promise<Blob> {
  const blob = await apiBlob(`/api/orders/${encodeURIComponent(orderId)}/payment-proof`, {
    cache: "no-store",
  });
  if (!PROOF_TYPES.includes(blob.type))
    throw new ApiError(422, "Bukti pembayaran bukan gambar JPG atau PNG.");
  return blob;
}

async function canDecode(file: Blob) {
  try {
    (await createImageBitmap(file)).close();
    return true;
  } catch {
    return false;
  }
}
