import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_URL } from "@/lib/env";
import { setToken } from "@/lib/auth-token";
import { logout } from "@/modules/auth/lib/auth-service";
import { PRODUCTS } from "@/test/products";
import { createOrder, loadCheckout } from "@/modules/checkout/data/checkout";
import { listReviews, submitReview } from "@/modules/reviews/data/reviews";
import { checkoutHref } from "../links";
import { orderAmount, paymentSeconds, PROOF_MAX_BYTES } from "../order";
import { fromApiOrder, type OrderDto } from "./orderDto";
import { getOrder, listOrders, loadPaymentProof, updateBuyerOrder } from "./orders";

const address = {
  recipient: "Penerima Uji",
  phone: "081234567890",
  street: "Jl. Uji",
  city: "Kota Uji",
  postalCode: "12345",
};
const email = "buyer.uji@pickathrift.test";
const dto: OrderDto = {
  id: "507f1f77bcf86cd799439011",
  buyer_id: "507f1f77bcf86cd799439012",
  product_id: { ...PRODUCTS[0]!, id: "507f1f77bcf86cd799439013", price: 90000 },
  address_snapshot: address,
  version: 7,
  total_price: 123456,
  item_price: 100000,
  shipping_fee: 23456,
  status: "MENUNGGU_PEMBAYARAN",
  createdAt: "2026-11-16T00:00:00Z",
  expiresAt: "2026-11-16T06:00:00Z",
};
const review = {
  id: "review-1",
  order_id: dto.id,
  rating: 5,
  comment: "Kondisi barang sesuai deskripsi.",
  author: "Nama dari server",
  createdAt: "2026-11-17T00:00:00Z",
};
function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: status < 400, data }), { status });
}
function failure(status: number, code: string) {
  return new Response(JSON.stringify({ success: false, message: "Permintaan ditolak.", code }), {
    status,
  });
}

beforeEach(() => {
  const tokens = new Map<string, string>();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => tokens.get(key) ?? null,
      setItem: (key: string, value: string) => tokens.set(key, value),
      removeItem: (key: string) => tokens.delete(key),
    },
  });
  setToken("buyer-token");
});
afterEach(() => {
  logout();
  vi.unstubAllGlobals();
});

describe("pemetaan pesanan", () => {
  it("memakai snapshot, total server tanpa ongkir ganda, versi, dan tanggal ISO", () => {
    const result = fromApiOrder(
      {
        ...dto,
        cancellation_reason: "admin",
        cancelledAt: "2026-11-17T01:00:00Z",
        verifiedAt: "2026-11-16T01:00:00Z",
        receivedAt: "2026-11-17T00:00:00Z",
        proof: {
          id: "proof-1",
          name: "uji.png",
          mime: "image/png",
          size: 128,
          uploadedAt: "2026-11-16T00:01:00Z",
          url: `/api/orders/${dto.id}/payment-proof`,
          unavailable: false,
        },
        shipment: { service: "Kurir Uji", number: "UJI123", shippedAt: "2026-11-16T12:00:00Z" },
        review,
      },
      email,
    );
    expect(result).toMatchObject({
      buyerEmail: email,
      version: 7,
      address,
      itemPrice: 100000,
      shippingFee: 23456,
      totalPrice: 123456,
      cancellation: "admin",
      expiresAt: Date.parse(dto.expiresAt),
      proof: {
        url: `/api/orders/${dto.id}/payment-proof`,
        uploadedAt: Date.parse("2026-11-16T00:01:00Z"),
      },
      review: { body: review.comment, author: review.author },
    });
    expect(result.shipment?.shippedAt).toBe(Date.parse("2026-11-16T12:00:00Z"));
    expect(result.cancelledAt).toBe(Date.parse("2026-11-17T01:00:00Z"));
    expect(result.verifiedAt).toBe(Date.parse("2026-11-16T01:00:00Z"));
    expect(result.receivedAt).toBe(Date.parse("2026-11-17T00:00:00Z"));
    expect(orderAmount(result)).toBe(123456);
    expect(paymentSeconds(result, result.expiresAt - 1)).toBe(1);
    expect(paymentSeconds(result, result.expiresAt)).toBe(0);
  });

  it("deadline tidak dihitung ulang di klien dan snapshot tidak diisi dari profil saat ini", () => {
    const result = fromApiOrder({ ...dto, expiresAt: "2026-11-16T07:00:00Z" }, email);
    expect(result.expiresAt).toBe(Date.parse("2026-11-16T07:00:00Z"));
    expect(() => fromApiOrder({ ...dto, address_snapshot: null })).toThrow(
      "Data pesanan tidak lengkap",
    );
  });
});

describe("checkout dan riwayat Buyer", () => {
  it("POST pesanan hanya mengirim product_id dan alamat, tanpa preflight stok atau harga", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => reply(dto, 201));
    vi.stubGlobal("fetch", fetcher);
    const order = await createOrder(dto.product_id.id, email, address);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const request = new Request(...fetcher.mock.calls[0]!);
    expect(request.url).toBe(`${API_URL}/api/orders`);
    expect(request.method).toBe("POST");
    expect(await request.json()).toEqual({ product_id: dto.product_id.id, address });
    expect(order.totalPrice).toBe(dto.total_price);
  });

  it("tanpa alamat eksplisit menyerahkan pemilihan alamat profil kepada server", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => reply(dto, 201));
    vi.stubGlobal("fetch", fetcher);
    await createOrder(dto.product_id.id, email);
    expect(await new Request(...fetcher.mock.calls[0]!).json()).toEqual({
      product_id: dto.product_id.id,
    });
  });

  it("meneruskan konflik stok 409 dari server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => failure(409, "STOCK_CONFLICT")),
    );
    await expect(createOrder(dto.product_id.id, email, address)).rejects.toMatchObject({
      status: 409,
      code: "STOCK_CONFLICT",
    });
  });

  it("checkout baru membaca riwayat, produk, dan alamat profil API", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) =>
      reply(
        String(input).endsWith("/api/orders/my")
          ? []
          : String(input).endsWith("/api/users/me")
            ? { email, address }
            : dto.product_id,
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    const checkout = await loadCheckout(dto.product_id.id, email);
    expect(checkout).toMatchObject({ order: null, address, fromProfile: true });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("melanjutkan pesanan memakai snapshot meski produk tidak lagi dapat dibaca di katalog", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => reply([dto]));
    vi.stubGlobal("fetch", fetcher);
    const checkout = await loadCheckout(dto.product_id.id, email);
    expect(checkout.order?.id).toBe(dto.id);
    expect(checkout.address).toEqual(address);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("tautan pembayaran mengacu ke pesanan yang dipilih", async () => {
    const order = fromApiOrder(dto, email);
    expect(checkoutHref(order)).toBe(`/checkout/${dto.product_id.id}?pesanan=${dto.id}`);
    const fetcher = vi.fn<typeof fetch>(async () => reply(dto));
    vi.stubGlobal("fetch", fetcher);
    await expect(loadCheckout(dto.product_id.id, email, dto.id)).resolves.toMatchObject({
      order: { id: dto.id },
    });
    expect(fetcher.mock.calls[0]?.[0]).toBe(`${API_URL}/api/orders/${dto.id}`);
    await expect(loadCheckout("produk-lain", email, dto.id)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("riwayat terurut terbaru dan galat 403/ID buruk tetap ditangani", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        reply([dto, { ...dto, id: "baru", createdAt: "2026-11-17T00:00:00Z" }]),
      )
      .mockResolvedValueOnce(failure(403, "FORBIDDEN"))
      .mockResolvedValueOnce(failure(422, "VALIDATION_ERROR"));
    vi.stubGlobal("fetch", fetcher);
    expect((await listOrders(email)).map((order) => order.id)).toEqual(["baru", dto.id]);
    await expect(getOrder(dto.id, email)).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    await expect(getOrder("id-buruk", email)).rejects.toMatchObject({ status: 404 });
  });

  it.each(["cancel", "receive"] as const)(
    "aksi %s mengirim objek JSON kosong dan memakai respons BE",
    async (type) => {
      const fetcher = vi.fn<typeof fetch>(async () =>
        reply({ ...dto, status: type === "cancel" ? "DIBATALKAN" : "SELESAI", version: 8 }),
      );
      vi.stubGlobal("fetch", fetcher);
      const updated = await updateBuyerOrder(fromApiOrder(dto, email), { type });
      const request = new Request(...fetcher.mock.calls[0]!);
      expect(request.url).toBe(`${API_URL}/api/orders/${dto.id}/${type}`);
      expect(await request.json()).toEqual({});
      expect(updated.version).toBe(8);
    },
  );
});

describe("bukti pembayaran privat", () => {
  it("mengirim tepat satu field multipart file setelah gambar berhasil didekode", async () => {
    const close = vi.fn();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ close })),
    );
    const fetcher = vi.fn<typeof fetch>(async () =>
      reply({ ...dto, status: "MENUNGGU_VERIFIKASI" }),
    );
    vi.stubGlobal("fetch", fetcher);
    await updateBuyerOrder(fromApiOrder(dto, email), {
      type: "upload",
      file: new File(["png"], "uji.png", { type: "image/png" }),
    });
    const request = new Request(...fetcher.mock.calls[0]!);
    expect(request.url).toBe(`${API_URL}/api/orders/${dto.id}/payment-proof`);
    expect(request.headers.get("Content-Type")).toMatch(/^multipart\/form-data; boundary=/);
    const form = await request.formData();
    expect([...form.keys()]).toEqual(["file"]);
    expect(form.get("file")).toMatchObject({ name: "uji.png", type: "image/png" });
    expect(close).toHaveBeenCalledOnce();
  });

  it("menolak MIME salah, ukuran berlebih, dan gambar rusak sebelum request", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => {
        throw new Error("invalid image");
      }),
    );
    for (const file of [
      new File(["x"], "uji.txt", { type: "text/plain" }),
      new File([new Uint8Array(PROOF_MAX_BYTES + 1)], "besar.png", { type: "image/png" }),
      new File(["rusak"], "uji.png", { type: "image/png" }),
    ])
      await expect(
        updateBuyerOrder(fromApiOrder(dto, email), { type: "upload", file }),
      ).rejects.toMatchObject({ status: 422 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("mengambil blob dengan Bearer tanpa token URL dan tanpa cache", async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "image/png" } }),
    );
    vi.stubGlobal("fetch", fetcher);
    const blob = await loadPaymentProof(dto.id);
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBe(3);
    const request = new Request(...fetcher.mock.calls[0]!);
    expect(request.url).toBe(`${API_URL}/api/orders/${dto.id}/payment-proof`);
    expect(request.headers.get("Authorization")).toBe("Bearer buyer-token");
    expect(request.cache).toBe("no-store");
  });

  it.each([401, 403, 404])("pembacaan bukti meneruskan galat %i", async (status) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => failure(status, "FILE_UNAVAILABLE")),
    );
    await expect(loadPaymentProof(dto.id)).rejects.toMatchObject({
      status,
      code: "FILE_UNAVAILABLE",
    });
  });
});

describe("ulasan API", () => {
  it("mengirim comment, memakai identitas respons server, dan mempertahankan REVIEW_EXISTS", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reply(review, 201))
      .mockResolvedValueOnce(failure(409, "REVIEW_EXISTS"));
    vi.stubGlobal("fetch", fetcher);
    const order = fromApiOrder({ ...dto, status: "SELESAI" }, email);
    const input = { rating: 5, body: ` ${review.comment} ` };
    const saved = await submitReview(order, input);
    const request = new Request(...fetcher.mock.calls[0]!);
    expect(request.url).toBe(`${API_URL}/api/orders/${dto.id}/review`);
    expect(await request.json()).toEqual({ rating: 5, comment: review.comment });
    expect(saved.review).toMatchObject({ author: review.author, body: review.comment });
    await expect(submitReview(order, input)).rejects.toMatchObject({
      status: 409,
      code: "REVIEW_EXISTS",
    });
  });

  it("ulasan publik tidak mengarang produk; ulasan saya berasal dari pesanan milik Buyer", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reply([review]))
      .mockResolvedValueOnce(reply([{ ...dto, status: "SELESAI", review }]));
    vi.stubGlobal("fetch", fetcher);
    const publicReviews = await listReviews();
    expect(publicReviews[0]).toMatchObject({
      id: review.id,
      author: review.author,
      body: review.comment,
    });
    expect(publicReviews[0]?.product).toBeUndefined();
    const ownReviews = await listReviews(email);
    expect(ownReviews[0]?.product?.id).toBe(dto.product_id.id);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      `${API_URL}/api/reviews`,
      `${API_URL}/api/orders/my`,
    ]);
  });
});
