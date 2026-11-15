const id = (value) => (value == null ? null : String(value._id ?? value.id ?? value));

function user(value) {
  return {
    id: id(value),
    name: value.name,
    email: value.email,
    role: value.role,
    phone: value.phone,
    address: value.address
      ? Object.fromEntries(
          ["recipient", "phone", "street", "city", "postalCode"].map((key) => [
            key,
            value.address[key],
          ]),
        )
      : null,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function product(value) {
  if (!value) return null;
  return {
    id: id(value),
    name: value.name,
    price: value.price,
    category: value.category,
    brand: value.brand,
    size: value.size,
    condition: value.condition,
    style: value.style,
    status: value.status,
    color: value.color,
    active: value.active,
    images: [...(value.images ?? [])],
    measurements: (value.measurements ?? []).map(({ label, cm }) => ({ label, cm })),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

const productRef = (value) => (value?.name !== undefined ? product(value) : id(value));

function order(value) {
  const buyer = value.buyer_id;
  return {
    id: id(value),
    buyer_id:
      buyer?.name !== undefined
        ? { id: id(buyer), name: buyer.name, email: buyer.email }
        : id(buyer),
    product_id: value.product_snapshot
      ? product(value.product_snapshot)
      : productRef(value.product_id),
    product_snapshot_source: value.product_snapshot_source,
    version: value.__v,
    status: value.status,
    proof: value.proof
      ? {
          id: value.proof.id,
          name: value.proof.name,
          mime: value.proof.mime,
          size: value.proof.size,
          uploadedAt: value.proof.uploadedAt,
          unavailable: Boolean(value.proof.unavailable),
          url: "/api/orders/" + id(value) + "/payment-proof",
        }
      : null,
    adminNote: value.adminNote ?? "",
    verifiedAt: value.verifiedAt ?? null,
    receivedAt: value.receivedAt ?? null,
    shipment: value.shipment
      ? {
          service: value.shipment.service,
          number: value.shipment.number,
          shippedAt: value.shipment.shippedAt,
        }
      : null,
    review: value.review ? publicReview(value.review) : null,
    tracking_number: value.tracking_number,
    total_price: value.total_price,
    item_price: value.item_price,
    shipping_fee: value.shipping_fee,
    address_snapshot: value.address_snapshot
      ? Object.fromEntries(
          ["recipient", "phone", "street", "city", "postalCode"].map((key) => [
            key,
            value.address_snapshot[key],
          ]),
        )
      : null,
    expiresAt: value.expiresAt,
    cancelledAt: value.cancelledAt,
    cancellation_reason: value.cancellation_reason,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function wishlist(value) {
  const unavailable = !value.product_id?.active;
  return {
    id: id(value),
    productId: id(value.populated?.("product_id") ?? value.product_id),
    product_id: unavailable ? null : product(value.product_id),
    unavailable,
    createdAt: value.createdAt,
  };
}

function review(value) {
  return {
    id: id(value),
    order_id: id(value.order_id),
    author: value.buyer_id?.name ?? "Buyer",
    rating: value.rating,
    comment: value.comment,
    createdAt: value.createdAt,
  };
}

function publicReview(value) {
  return {
    id: id(value),
    author: value.buyer_id?.name ?? "Buyer",
    rating: value.rating,
    comment: value.comment,
    createdAt: value.createdAt,
  };
}
module.exports = { user, product, order, wishlist, review, publicReview };
