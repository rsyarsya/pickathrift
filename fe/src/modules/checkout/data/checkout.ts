import { ApiError } from "@/lib/api";
import { getProduct, type Demo } from "@/modules/catalog/data/products";
import { paymentExpiry, type Order } from "@/modules/orders/order";
import { withOrders } from "@/modules/orders/data/orderStore";
import { validateAddress, type ShippingAddress } from "@/modules/profile/address";
import { getShippingAddress } from "@/modules/profile/data/profile";
import { DEMO_ADDRESS } from "@/modules/profile/data/fixtures";
import { REJECTED_PROOF, TRANSFER_ACCOUNT, demoOrder } from "./fixtures";

const ORDER_DEMOS = ["bayar", "file-ditolak", "verifikasi", "unggah-ulang"];
const FORM_DEMOS = ["memproses", "konflik", "koneksi", "alamat"];

export function getTransferAccount() {
  return TRANSFER_ACCOUNT;
}

function activeOrder(orders: Order[], productId: string, email: string) {
  return (
    orders.find(
      (order) =>
        order.product.id === productId &&
        order.buyerEmail === email &&
        order.status !== "DIBATALKAN",
    ) ?? null
  );
}

export async function loadCheckout(productId: string, buyerEmail: string, demo: Demo) {
  const email = buyerEmail.toLowerCase();
  const [product, savedAddress] = await Promise.all([
    getProduct(productId, { includeOrderStock: false }),
    getShippingAddress(email),
  ]);
  if (demo === "gagal") throw new ApiError(503, "Checkout gagal dimuat. Coba lagi.");

  const order =
    demo && ORDER_DEMOS.includes(demo)
      ? demoOrder(product, email, demo, Date.now())
      : demo && FORM_DEMOS.includes(demo)
        ? null
        : await withOrders((orders) => activeOrder(orders, productId, email));

  return {
    product,
    order,
    address:
      demo && FORM_DEMOS.includes(demo)
        ? {
            ...DEMO_ADDRESS,
            ...(demo === "alamat" && { phone: "", postalCode: "552" }),
          }
        : savedAddress,
    fromProfile: Boolean(savedAddress || (demo && FORM_DEMOS.includes(demo))),
    account: getTransferAccount(),
    rejectedProof: demo === "file-ditolak" ? REJECTED_PROOF : null,
  };
}

export async function createOrder(
  productId: string,
  buyerEmail: string,
  address: ShippingAddress,
  demo: Demo = null,
) {
  const product = await getProduct(productId, { includeOrderStock: false });
  if (Object.keys(validateAddress(address)).length)
    throw new ApiError(422, "Periksa alamat pengiriman.");
  if (demo === "konflik") throw new ApiError(409, "Stok sudah dipesan.");
  const email = buyerEmail.toLowerCase();

  return withOrders((orders, save, now) => {
    const existing = activeOrder(orders, productId, email);
    if (existing) return existing;
    if (
      product.status !== "available" ||
      orders.some((order) => order.product.id === productId && order.status !== "DIBATALKAN")
    ) {
      throw new ApiError(409, "Stok sudah dipesan.");
    }
    const order: Order = {
      id: `PCT-${crypto.randomUUID()}`,
      buyerEmail: email,
      product,
      address,
      status: "MENUNGGU_PEMBAYARAN",
      createdAt: now,
      expiresAt: paymentExpiry(now),
    };
    save(order);
    return order;
  });
}
