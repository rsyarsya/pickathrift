import { ApiError } from "@/lib/api";
import { fromApiProduct } from "@/modules/catalog/data/products";
import type { Product } from "@/modules/catalog/types";
import type { ShippingAddress } from "@/modules/profile/address";
import type { Order } from "../order";

export type ReviewDto = {
  id: string;
  order_id?: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
};
export type OrderDto = {
  id: string;
  buyer_id: string | { id: string; name: string; email: string };
  product_id: Product;
  address_snapshot: ShippingAddress | null;
  status: Order["status"];
  version: number;
  total_price: number;
  item_price: number;
  shipping_fee: number;
  createdAt: string;
  expiresAt: string;
  cancelledAt?: string | null;
  cancellation_reason?: Order["cancellation"] | null;
  proof?: {
    id: string;
    name: string;
    mime: string;
    size: number;
    uploadedAt: string;
    url: string;
    unavailable: boolean;
  } | null;
  adminNote?: string;
  verifiedAt?: string | null;
  receivedAt?: string | null;
  shipment?: { service: string; number: string; shippedAt: string } | null;
  review?: ReviewDto | null;
};

export function fromApiReview(dto: ReviewDto): NonNullable<Order["review"]> {
  return {
    rating: dto.rating,
    body: dto.comment,
    author: dto.author,
    createdAt: Date.parse(dto.createdAt),
  };
}

/** Harga, alamat, produk, dan deadline berasal dari salinan pesanan BE. */
export function fromApiOrder(dto: OrderDto, buyerEmail = ""): Order {
  if (!dto.address_snapshot || !dto.product_id || typeof dto.product_id !== "object")
    throw new ApiError(502, "Data pesanan tidak lengkap. Coba muat ulang.");
  return {
    id: dto.id,
    buyerEmail: typeof dto.buyer_id === "object" ? dto.buyer_id.email : buyerEmail,
    product: fromApiProduct(dto.product_id),
    address: dto.address_snapshot,
    status: dto.status,
    version: dto.version,
    totalPrice: dto.total_price,
    itemPrice: dto.item_price,
    shippingFee: dto.shipping_fee,
    createdAt: Date.parse(dto.createdAt),
    expiresAt: Date.parse(dto.expiresAt),
    cancelledAt: dto.cancelledAt ? Date.parse(dto.cancelledAt) : undefined,
    cancellation: dto.cancellation_reason ?? undefined,
    proof: dto.proof ? { ...dto.proof, uploadedAt: Date.parse(dto.proof.uploadedAt) } : undefined,
    adminNote: dto.adminNote,
    verifiedAt: dto.verifiedAt ? Date.parse(dto.verifiedAt) : undefined,
    receivedAt: dto.receivedAt ? Date.parse(dto.receivedAt) : undefined,
    shipment: dto.shipment
      ? { ...dto.shipment, shippedAt: Date.parse(dto.shipment.shippedAt) }
      : undefined,
    review: dto.review ? fromApiReview(dto.review) : undefined,
  };
}
