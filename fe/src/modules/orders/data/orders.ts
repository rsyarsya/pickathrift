import { ApiError } from "@/lib/api";
import { buyerOrderAction, expireOrder, validateProof, type Order } from "../order";
import { HISTORY_EXAMPLES, orderExample } from "./fixtures";
import { withOrders } from "./orderStore";

const delay = () => new Promise<void>((resolve) => setTimeout(resolve, 450));

export function ownedOrder(orders: Order[], id: string, email: string) {
  const order = orders.find((item) => item.id === id);
  if (!order) throw new ApiError(404, "Pesanan tidak ditemukan.");
  // X1.3: pesanan ada tapi milik akun lain.
  if (order.buyerEmail !== email.toLowerCase()) {
    throw new ApiError(403, "Kamu hanya bisa melihat pesanan dari akunmu sendiri.");
  }
  return order;
}

export async function listOrders(email: string, demo: string | null) {
  if (demo === "riwayat") {
    const samples = await Promise.all(HISTORY_EXAMPLES.map((id) => orderExample(id, email, demo)));
    return samples.filter((order) => order !== null);
  }
  await delay();
  if (demo === "gagal") throw new ApiError(503, "Riwayat pesanan gagal dimuat.");
  if (demo === "kosong") return [];
  return withOrders((orders) =>
    orders
      .filter((order) => order.buyerEmail === email.toLowerCase())
      .sort((a, b) => b.createdAt - a.createdAt),
  );
}

const detailDemos = ["riwayat", "diproses", "dikirim", "selesai", "dibatalkan", "batal"];

export async function getOrder(id: string, email: string, demo: string | null = null) {
  if (demo && detailDemos.includes(demo)) {
    const example = await orderExample(id, email, demo);
    if (example) return example;
  }
  await delay();
  if (demo === "gagal") throw new ApiError(503, "Detail pesanan gagal dimuat.");
  if (demo === "bukan-milikmu") {
    throw new ApiError(403, "Kamu hanya bisa melihat pesanan dari akunmu sendiri.");
  }
  return withOrders((orders) => ownedOrder(orders, id, email));
}

type BuyerAction = { type: "cancel" } | { type: "receive" } | { type: "upload"; file: File };

export async function updateBuyerOrder(order: Order, action: BuyerAction) {
  await delay();

  function update(current: Order, now: number): Order {
    if (!buyerOrderAction(current, action.type, now)) {
      throw new ApiError(
        409,
        current.cancellation === "expired" || expireOrder(current, now) !== current
          ? "Batas waktu pembayaran sudah habis."
          : "Status pesanan sudah berubah. Muat ulang untuk melihat status terbaru.",
      );
    }
    if (action.type === "cancel")
      return { ...current, status: "DIBATALKAN", cancellation: "buyer" };
    if (action.type === "receive") return { ...current, status: "SELESAI", receivedAt: now };
    const { file } = action;
    const error = validateProof(file);
    if (error) throw new ApiError(422, error);
    return {
      ...current,
      status: "MENUNGGU_VERIFIKASI",
      proof: { name: file.name, size: file.size, uploadedAt: now, file },
    };
  }

  if (order.demo) return update(order, Date.now());
  return withOrders((orders, save, now) => {
    const updated = update(ownedOrder(orders, order.id, order.buyerEmail), now);
    save(updated);
    return updated;
  });
}
