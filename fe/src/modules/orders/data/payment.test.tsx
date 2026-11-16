import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PRODUCTS } from "@/test/products";
import { setToken } from "@/lib/auth-token";
import { logout } from "@/modules/auth/lib/auth-service";
import { canAdmin } from "@/modules/admin/orderActions";
import { PaymentProgress } from "@/modules/checkout/components/PaymentProgress";
import { GatewayPayment } from "../components/GatewayPayment";
import { paymentSeconds } from "../order";
import { fromApiOrder, type OrderDto } from "./orderDto";
import { createPaymentSession, syncPayment } from "./payment";

const id = "507f1f77bcf86cd799439011";
const dto: OrderDto = {
  id,
  buyer_id: "buyer",
  product_id: PRODUCTS[0]!,
  version: 1,
  status: "MENUNGGU_PEMBAYARAN",
  total_price: 100000,
  item_price: 85000,
  shipping_fee: 15000,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 21600000).toISOString(),
  address_snapshot: {
    recipient: "Buyer",
    phone: "081234567890",
    street: "Jl. Uji",
    city: "Yogyakarta",
    postalCode: "55281",
  },
  payment: {
    provider: "midtrans",
    status: "ready",
    merchantOrderId: `picka-${id}`,
    channel: "qris",
    paidAt: null,
    providerExpiresAt: new Date(Date.now() + 900000).toISOString(),
    checkedAt: null,
    reviewReason: null,
  },
};
const session = {
  provider: "midtrans",
  status: "ready",
  merchantOrderId: `picka-${id}`,
  redirectUrl:
    "https://app.sandbox.midtrans.com/snap/v4/redirection/12345678-1234-1234-1234-123456789abc",
  expiresAt: dto.expiresAt,
  sessionExpiresAt: new Date(Date.now() + 600000).toISOString(),
};
const reply = (data: unknown) => new Response(JSON.stringify({ success: true, data }));
beforeEach(() => {
  const tokens = new Map<string, string>();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (k: string) => tokens.get(k) ?? null,
      setItem: (k: string, v: string) => tokens.set(k, v),
      removeItem: (k: string) => tokens.delete(k),
    },
  });
  setToken("qa-token");
});
afterEach(() => {
  logout();
  vi.unstubAllGlobals();
});

describe("pembayaran Midtrans", () => {
  it("meminta sesi tanpa nominal/kanal dari FE, memakai Bearer dan tidak memakai cache", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => reply(session));
    vi.stubGlobal("fetch", fetcher);
    expect((await createPaymentSession(fromApiOrder(dto))).redirectUrl).toBe(session.redirectUrl);
    const request = new Request(...fetcher.mock.calls[0]!);
    expect(request.method).toBe("POST");
    expect(await request.json()).toEqual({});
    expect(request.url).toMatch(new RegExp(`/api/orders/${id}/payment$`));
    expect(request.headers.get("Authorization")).toBe("Bearer qa-token");
    expect(request.cache).toBe("no-store");
  });
  it.each([
    { redirectUrl: "https://evil.test/snap/v4/redirection/12345678-1234-1234-1234-123456789abc" },
    {
      redirectUrl:
        "https://user:pass@app.sandbox.midtrans.com/snap/v4/redirection/12345678-1234-1234-1234-123456789abc",
    },
    { redirectUrl: session.redirectUrl + "?next=evil" },
    {
      redirectUrl:
        "https://app.midtrans.com/snap/v4/redirection/12345678-1234-1234-1234-123456789abc",
    },
    { merchantOrderId: "another-order" },
    { sessionExpiresAt: "bad" },
    { sessionExpiresAt: new Date(0).toISOString() },
    { expiresAt: new Date(Date.now() + 43200000).toISOString() },
    { sessionExpiresAt: new Date(Date.now() + 43200000).toISOString() },
  ])("menolak sesi yang tidak cocok atau URL tidak aman %j", async (override) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => reply({ ...session, ...override })),
    );
    await expect(createPaymentSession(fromApiOrder(dto))).rejects.toMatchObject({ status: 502 });
  });
  it("status berasal dari respons sync BE, bukan query callback atau penghitungan FE", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        reply({
          ...dto,
          status: "DIPROSES",
          payment: { ...dto.payment, status: "settled", paidAt: new Date().toISOString() },
        }),
      ),
    );
    const updated = await syncPayment(fromApiOrder(dto));
    expect(updated.status).toBe("DIPROSES");
    expect(updated.payment?.paidAt).toBeTypeOf("number");
    expect(paymentSeconds(updated, Date.now())).toBeNull();
  });
  it("countdown memakai tenggat kanal yang lebih awal dan tidak membatalkan order di klien", () => {
    const order = fromApiOrder(dto);
    const deadline = order.payment!.providerExpiresAt!;
    expect(paymentSeconds(order, deadline - 1000)).toBe(1);
    expect(paymentSeconds(order, deadline)).toBe(0);
    expect(order.status).toBe("MENUNGGU_PEMBAYARAN");
  });
  it("gateway tidak menampilkan bukti/rekening manual dan progres tidak memuat verifikasi manual", () => {
    const html = renderToStaticMarkup(
      <GatewayPayment order={fromApiOrder(dto)} onChange={() => {}} />,
    );
    expect(html).toContain("Virtual Account");
    expect(html).toContain("QRIS");
    expect(html).not.toContain('type="file"');
    expect(html).not.toContain("rekening toko");
    const progress = renderToStaticMarkup(<PaymentProgress current={3} gateway />);
    expect(progress).not.toContain("Verifikasi");
    expect(progress).toContain("Diproses");
  });
  it("review_required menghilangkan tindakan bayar/batal; Admin juga tidak boleh kirim", () => {
    const order = fromApiOrder({
      ...dto,
      payment: { ...dto.payment!, status: "review_required", reviewReason: "LATE_SETTLEMENT" },
    });
    const html = renderToStaticMarkup(<GatewayPayment order={order} onChange={() => {}} />);
    expect(html).toContain("Jangan melakukan pembayaran lagi");
    expect(html).not.toContain("Lanjutkan pembayaran");
    expect(html).not.toContain("Batalkan pesanan");
    expect(canAdmin({ ...order, status: "DIPROSES" }, "ship")).toBe(false);
  });
  it("Admin hanya dapat kirim gateway lunas; verifikasi manual tetap berlaku untuk order lama", () => {
    const order = fromApiOrder({
      ...dto,
      status: "DIPROSES",
      payment: { ...dto.payment!, status: "settled" },
    });
    expect(canAdmin(order, "ship")).toBe(true);
    expect(canAdmin(order, "approve")).toBe(false);
    expect(canAdmin({ ...order, status: "MENUNGGU_VERIFIKASI" }, "approve")).toBe(false);
    expect(canAdmin({ status: "MENUNGGU_VERIFIKASI" }, "approve")).toBe(true);
  });
});
