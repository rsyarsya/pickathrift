import { ApiError } from "@/lib/api";
import { applyAdminAction, type AdminOrderAction } from "@/modules/admin/orderActions";
import { PRODUCTS } from "@/modules/catalog/data/fixtures";
import { paymentExpiry, type Order, type OrderStatus } from "@/modules/orders/order";
import { withOrders } from "@/modules/orders/data/orderStore";
import type { ShippingAddress } from "@/modules/profile/address";

/*
 * Pintu admin ke pesanan (M3). Membaca pesanan yang dibuat Buyer lewat checkout di
 * IndexedDB yang sama, jadi setiap aksi admin langsung terlihat di B6/B7 Buyer.
 * Nanti diganti GET /admin/orders, GET /admin/orders/:id, PATCH /admin/orders/:id.
 *
 * `?demo=contoh` menampilkan enam pesanan contoh seperti di Figma. Contoh hanya hidup di
 * memori tab dan tidak mengubah stok.
 */

export type Demo = string | null;

const delay = (ms = 450) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const offline = () =>
  new ApiError(503, "Koneksi ke server terputus. Periksa internetmu, lalu coba lagi.");

const DAY = 86_400_000;

const buyer = (recipient: string, phone: string, street: string): ShippingAddress => ({
  recipient,
  phone,
  street,
  city: "Yogyakarta",
  postalCode: "55281",
});

const SAMPLE_SPECS: {
  id: string;
  productId: string;
  status: OrderStatus;
  daysAgo: number;
  address: ShippingAddress;
}[] = [
  {
    id: "PCT-007",
    productId: "work-jacket-olive",
    status: "MENUNGGU_VERIFIKASI",
    daysAgo: 0,
    address: buyer(
      "Dinda Maharani",
      "0812 3456 7890",
      "Jl. Kaliurang Km 5, Gg. Pandega Marta No. 12, Sleman",
    ),
  },
  {
    id: "PCT-006",
    productId: "band-tee-black",
    status: "MENUNGGU_PEMBAYARAN",
    daysAgo: 0,
    address: buyer("Raka Pratama", "0857 1111 2020", "Jl. Seturan Raya No. 8, Depok, Sleman"),
  },
  {
    id: "PCT-005",
    productId: "corduroy-jacket-tan",
    status: "DIPROSES",
    daysAgo: 1,
    address: buyer("Sasa Kirana", "0813 2222 1100", "Jl. Gejayan No. 21, Depok, Sleman"),
  },
  {
    id: "PCT-004",
    productId: "denim-jacket-blue",
    status: "DIKIRIM",
    daysAgo: 3,
    address: buyer("Bima Aditya", "0821 3333 4455", "Jl. Magelang Km 4, Sinduadi, Sleman"),
  },
  {
    id: "PCT-003",
    productId: "cotton-shirt-blue",
    status: "SELESAI",
    daysAgo: 14,
    address: buyer(
      "Dinda Maharani",
      "0812 3456 7890",
      "Jl. Kaliurang Km 5, Gg. Pandega Marta No. 12, Sleman",
    ),
  },
  {
    id: "PCT-002",
    productId: "straight-jeans-blue",
    status: "DIBATALKAN",
    daysAgo: 22,
    address: buyer("Nadia Rahma", "0878 5555 6677", "Jl. Parangtritis Km 3, Sewon, Bantul"),
  },
];

let samples: Order[] | null = null;

function sampleOrders(): Order[] {
  if (samples) return samples;
  const now = Date.now();
  samples = SAMPLE_SPECS.map((spec) => {
    const createdAt = now - spec.daysAgo * DAY - 2 * 3600_000;
    const product = PRODUCTS.find((p) => p.id === spec.productId) ?? PRODUCTS[0]!;
    const paid = spec.status !== "MENUNGGU_PEMBAYARAN" && spec.status !== "DIBATALKAN";
    return {
      id: spec.id,
      buyerEmail: `${spec.address.recipient.split(" ")[0]!.toLowerCase()}@contoh.test`,
      product,
      address: spec.address,
      createdAt,
      expiresAt: paymentExpiry(now),
      status: spec.status,
      demo: true,
      ...(paid && {
        proof: { name: "bukti-transfer.jpg", size: 180_000, uploadedAt: createdAt + 1800_000 },
      }),
      ...((spec.status === "DIPROSES" ||
        spec.status === "DIKIRIM" ||
        spec.status === "SELESAI") && {
        verifiedAt: createdAt + 3 * 3600_000,
      }),
      ...((spec.status === "DIKIRIM" || spec.status === "SELESAI") && {
        shipment: {
          service: "JNE REG",
          number: "JNE 0123 4567 8901",
          shippedAt: createdAt + DAY,
        },
      }),
      ...(spec.status === "SELESAI" && { receivedAt: createdAt + 3 * DAY }),
      ...(spec.status === "DIBATALKAN" && {
        cancellation: "admin" as const,
        adminNote: "Nominal tidak sesuai total",
      }),
    } satisfies Order;
  });
  return samples;
}

const newestFirst = (a: Order, b: Order) => b.createdAt - a.createdAt;

export async function listAdminOrders(demo: Demo = null): Promise<Order[]> {
  if (demo === "memuat") return new Promise(() => {});
  await delay();
  if (demo === "gagal") throw offline();
  if (demo === "kosong") return [];
  if (demo === "contoh") return [...sampleOrders()].sort(newestFirst);
  if (typeof indexedDB === "undefined") return [];
  return withOrders((orders) => [...orders].sort(newestFirst));
}

export async function getAdminOrder(id: string, demo: Demo = null): Promise<Order> {
  await delay();
  if (demo === "gagal") throw offline();
  const sample = sampleOrders().find((o) => o.id === id);
  if (demo === "contoh" && sample) return sample;
  const order =
    typeof indexedDB === "undefined"
      ? undefined
      : await withOrders((orders) => orders.find((o) => o.id === id));
  if (!order) throw new ApiError(404, "Pesanan tidak ditemukan.");
  return order;
}

export async function updateAdminOrder(order: Order, action: AdminOrderAction): Promise<Order> {
  await delay(650);
  if (order.demo) {
    const updated = applyAdminAction(order, action, Date.now());
    samples = sampleOrders().map((o) => (o.id === order.id ? updated : o));
    return updated;
  }
  return withOrders((orders, save, now) => {
    const current = orders.find((o) => o.id === order.id);
    if (!current) throw new ApiError(404, "Pesanan tidak ditemukan.");
    const updated = applyAdminAction(current, action, now);
    save(updated);
    return updated;
  });
}
