const id = (value) => (value == null ? null : String(value._id ?? value));

function user(value) {
  return {
    id: id(value),
    name: value.name,
    email: value.email,
    role: value.role,
    phone: value.phone,
    address: value.address,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function product(value) {
  if (!value) return null;
  return {
    id: id(value),
    title: value.title,
    price: value.price,
    category: value.category,
    clothing_type: value.clothing_type,
    brand: value.brand,
    size: value.size,
    condition: value.condition,
    style: value.style,
    status: value.status,
    image_url: value.image_url,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

const productRef = (value) => (value?.title !== undefined ? product(value) : id(value));

function order(value) {
  const buyer = value.buyer_id;
  return {
    id: id(value),
    buyer_id:
      buyer?.name !== undefined
        ? { id: id(buyer), name: buyer.name, email: buyer.email }
        : id(buyer),
    product_id: productRef(value.product_id),
    status: value.status,
    tracking_number: value.tracking_number,
    total_price: value.total_price,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function wishlist(value) {
  return { id: id(value), product_id: productRef(value.product_id), createdAt: value.createdAt };
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

module.exports = { user, product, order, wishlist, review };
