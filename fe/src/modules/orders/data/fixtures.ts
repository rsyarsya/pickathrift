import { getProduct } from "@/modules/catalog/data/products";
import { DEMO_ADDRESS } from "@/modules/profile/data/fixtures";
import { paymentExpiry, type Order, type OrderStatus } from "../order";

// SEMENTARA: contoh pesanan dari Figma, tidak dimasukkan ke riwayat atau stok Buyer.
const examples: Record<string, { productId: string; status: OrderStatus; daysAgo: number }> = {
  "PCT-006": { productId: "band-tee-black", status: "MENUNGGU_PEMBAYARAN", daysAgo: 0 },
  "PCT-005": { productId: "denim-jacket-blue", status: "DIKIRIM", daysAgo: 3 },
  "PCT-004": { productId: "cotton-shirt-blue", status: "SELESAI", daysAgo: 12 },
  "PCT-003": { productId: "work-jacket-olive", status: "DIBATALKAN", daysAgo: 20 },
  "PCT-001": { productId: "work-jacket-olive", status: "DIPROSES", daysAgo: 5 },
};

export const HISTORY_EXAMPLES = ["PCT-006", "PCT-005", "PCT-004", "PCT-003"];

const demoStatuses: Record<string, OrderStatus> = {
  diproses: "DIPROSES",
  dikirim: "DIKIRIM",
  selesai: "SELESAI",
  dibatalkan: "DIBATALKAN",
  batal: "MENUNGGU_PEMBAYARAN",
};

export async function orderExample(id: string, email: string, demo: string) {
  const example = Object.hasOwn(examples, id) ? examples[id] : undefined;
  if (!example) return null;
  const demoStatus = Object.hasOwn(demoStatuses, demo) ? demoStatuses[demo] : undefined;
  const status = demoStatus ?? example.status;
  const now = Date.now();
  const createdAt = status === "MENUNGGU_PEMBAYARAN" ? now : now - example.daysAgo * 86_400_000;
  const product = await getProduct(example.productId, { includeOrderStock: false });
  const order: Order = {
    id,
    buyerEmail: email.toLowerCase(),
    product,
    address: DEMO_ADDRESS,
    createdAt,
    expiresAt: paymentExpiry(createdAt),
    status,
    demo: true,
    ...(status === "DIKIRIM" && {
      shipment: { service: "JNE Reg", number: "JNE 0123 4567 8901", shippedAt: now - 86_400_000 },
    }),
    ...(status === "SELESAI" && { receivedAt: now - 86_400_000 }),
    ...(status === "DIBATALKAN" && {
      cancellation: "admin",
      adminNote: "Bukti transfer tidak sesuai nominal.",
    }),
  };
  return order;
}
