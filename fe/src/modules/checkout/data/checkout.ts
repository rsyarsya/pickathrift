import { apiData, ApiError } from "@/lib/api";
import { getProduct } from "@/modules/catalog/data/products";
import type { Product } from "@/modules/catalog/types";
import type { Order } from "@/modules/orders/order";
import { getOrder, listOrders } from "@/modules/orders/data/orders";
import { fromApiOrder, type OrderDto } from "@/modules/orders/data/orderDto";
import { validateAddress, type ShippingAddress } from "@/modules/profile/address";
import { getShippingAddress } from "@/modules/profile/data/profile";

export function getTransferAccount() {
  const bank = process.env.NEXT_PUBLIC_TRANSFER_BANK?.trim();
  const number = process.env.NEXT_PUBLIC_TRANSFER_NUMBER?.trim();
  const holder = process.env.NEXT_PUBLIC_TRANSFER_HOLDER?.trim();
  return bank && number && holder ? { bank, number, holder } : null;
}

export async function loadCheckout(productId: string, buyerEmail: string, orderId?: string | null) {
  const email = buyerEmail.toLowerCase();
  if (orderId) {
    const order = await getOrder(orderId, email);
    if (order.product.id !== productId)
      throw new ApiError(404, "Pesanan tidak sesuai dengan barang ini.");
    return checkoutData(order.product, order.address, order);
  }
  const orders = await listOrders(email);
  const existing = orders.find(
    (order) => order.product.id === productId && order.status !== "DIBATALKAN",
  );
  if (existing) return checkoutData(existing.product, existing.address, existing);
  const [product, address] = await Promise.all([getProduct(productId), getShippingAddress()]);
  return checkoutData(product, address, null);
}

function checkoutData(product: Product, address: ShippingAddress | null, order: Order | null) {
  return {
    product,
    order,
    address,
    fromProfile: Boolean(address),
    account: getTransferAccount(),
  };
}

export async function createOrder(
  productId: string,
  buyerEmail: string,
  address?: ShippingAddress,
) {
  if (address && Object.keys(validateAddress(address)).length)
    throw new ApiError(422, "Periksa alamat pengiriman.");
  const dto = await apiData<OrderDto>("/api/orders", {
    method: "POST",
    body: JSON.stringify({ product_id: productId, ...(address ? { address } : {}) }),
  });
  return fromApiOrder(dto, buyerEmail.toLowerCase());
}
