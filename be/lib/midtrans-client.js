// Tidak menerima base URL dari environment/request: batch ini khusus sandbox.
const SNAP_URL = "https://app.sandbox.midtrans.com/snap/v1/transactions";
const REQUEST_TIMEOUT_MS = 10000;
const UUID = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
const ENABLED_PAYMENTS = ["bca_va", "bni_va", "bri_va", "permata_va", "echannel", "other_qris"];

function validSnapSession(token, redirectUrl) {
  if (typeof token !== "string" || !new RegExp(`^${UUID}$`, "i").test(token)) return false;
  try {
    const url = new globalThis.URL(redirectUrl);
    return (
      url.origin === "https://app.sandbox.midtrans.com" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      new RegExp(`^/snap/v\\d+/redirection/${UUID}$`, "i").test(url.pathname)
    );
  } catch {
    return false;
  }
}

function snapPayload(order, account, frontendUrl, pageMinutes) {
  const address = order.address_snapshot;
  const start =
    new Date(order.createdAt.getTime() + 7 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ") + " +0700";
  return {
    transaction_details: {
      order_id: order.payment.merchantOrderId,
      gross_amount: order.total_price,
    },
    enabled_payments: [...ENABLED_PAYMENTS],
    item_details: [
      {
        id: String(order.product_id),
        price: order.item_price,
        quantity: 1,
        name: order.product_snapshot.name.slice(0, 50),
      },
      { id: "shipping", price: order.shipping_fee, quantity: 1, name: "Ongkos kirim" },
    ],
    customer_details: {
      first_name: address.recipient.slice(0, 50),
      email: account.email,
      phone: address.phone,
      shipping_address: {
        first_name: address.recipient.slice(0, 50),
        phone: address.phone,
        address: address.street,
        city: address.city,
        postal_code: address.postalCode,
        country_code: "IDN",
      },
    },
    expiry: { start_time: start, unit: "minutes", duration: 360 },
    page_expiry: { unit: "minutes", duration: pageMinutes },
    callbacks: { finish: `${frontendUrl}/pesanan/${order.id}` },
  };
}

async function createSnap(config, payload) {
  const response = await fetch(SNAP_URL, {
    method: "POST",
    redirect: "error",
    headers: {
      Authorization: `Basic ${Buffer.from(config.serverKey + ":").toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    signal: globalThis.AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status !== 201) throw new Error("MIDTRANS_RESPONSE_UNCERTAIN");
  const data = await response.json();
  if (!validSnapSession(data?.token, data?.redirect_url))
    throw new Error("MIDTRANS_RESPONSE_UNCERTAIN");
  return { snapToken: data.token, redirectUrl: data.redirect_url };
}

async function providerRequest(config, url, method = "GET", snap = false) {
  const response = await fetch(url, {
    method,
    redirect: "error",
    headers: {
      Authorization: snap
        ? config.serverKey
        : `Basic ${Buffer.from(config.serverKey + ":").toString("base64")}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    signal: globalThis.AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const data = await response.json();
  return { status: response.status, data };
}

async function getStatus(config, merchantOrderId) {
  const result = await providerRequest(
    config,
    `https://api.sandbox.midtrans.com/v2/${encodeURIComponent(merchantOrderId)}/status`,
  );
  if ([200, 404].includes(result.status) && result.data?.status_code === "404") return null;
  if (result.status !== 200 || !result.data?.transaction_status)
    throw new Error("MIDTRANS_STATUS_UNCERTAIN");
  return result.data;
}

async function stopTransaction(config, merchantOrderId, expire) {
  // Hasil aksi tidak menjadi bukti terminal; pemanggil selalu GET status kembali.
  await providerRequest(
    config,
    `https://api.sandbox.midtrans.com/v2/${encodeURIComponent(merchantOrderId)}/${expire ? "expire" : "cancel"}`,
    "POST",
  );
}

async function closeSnap(config, token) {
  const { status, data } = await providerRequest(
    config,
    `https://app.sandbox.midtrans.com/snap/v1/transactions/${encodeURIComponent(token)}/cancel`,
    "POST",
    true,
  );
  return (
    (status >= 200 &&
      status < 300 &&
      typeof data?.canceled_at === "string" &&
      Number.isFinite(Date.parse(data.canceled_at))) ||
    ([400, 409].includes(status) &&
      Array.isArray(data?.error_messages) &&
      data.error_messages.includes("token already canceled"))
  );
}

module.exports = {
  createSnap,
  snapPayload,
  validSnapSession,
  REQUEST_TIMEOUT_MS,
  getStatus,
  stopTransaction,
  closeSnap,
};
