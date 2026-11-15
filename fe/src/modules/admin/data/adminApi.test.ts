import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_URL } from "@/lib/env";
import { setToken } from "@/lib/auth-token";
import { logout } from "@/modules/auth/lib/auth-service";
import { PRODUCTS } from "@/test/products";
import { fromApiOrder, type OrderDto } from "@/modules/orders/data/orderDto";
import type { AdminOrderAction } from "../orderActions";
import {
  adminOrderRevision,
  countPendingOrders,
  getAdminOrder,
  listAdminOrders,
  updateAdminOrder,
} from "./orders";
import {
  getAdminProduct,
  listAdminProducts,
  saveProduct,
  setProductActive,
  uploadProductImages,
} from "./products";

const product = {
  ...PRODUCTS[0]!,
  id: "507f1f77bcf86cd799439011",
  images: ["/uploads/products/uji.png"],
};
const dto: OrderDto = {
  id: "507f1f77bcf86cd799439012",
  buyer_id: { id: "buyer-1", name: "Buyer Uji", email: "buyer.uji@pickathrift.test" },
  product_id: product,
  address_snapshot: {
    recipient: "Penerima Uji",
    phone: "081234567890",
    street: "Jl. Uji",
    city: "Kota Uji",
    postalCode: "12345",
  },
  status: "MENUNGGU_VERIFIKASI",
  version: 3,
  total_price: 123456,
  item_price: 100000,
  shipping_fee: 23456,
  createdAt: "2026-11-16T00:00:00Z",
  expiresAt: "2026-11-16T06:00:00Z",
  proof: {
    id: "507f1f77bcf86cd799439013",
    name: "uji.png",
    mime: "image/png",
    size: 100,
    uploadedAt: "2026-11-16T00:01:00Z",
    url: "/api/orders/proof",
    unavailable: false,
  },
};
const counts = {
  MENUNGGU_PEMBAYARAN: 2,
  MENUNGGU_VERIFIKASI: 75,
  PERLU_UNGGAH_ULANG: 3,
  DIPROSES: 4,
  DIKIRIM: 5,
  SELESAI: 6,
  DIBATALKAN: 7,
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
  const storage = new Map<string, string>();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
  setToken("admin-token");
});
afterEach(() => {
  logout();
  vi.unstubAllGlobals();
});

describe("produk Admin dari API", () => {
  it("membaca semua halaman dan mengirim filter status/active yang didukung", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reply({ items: [product], totalPages: 2 }))
      .mockResolvedValueOnce(reply({ items: [{ ...product, id: "kedua" }], totalPages: 2 }));
    vi.stubGlobal("fetch", fetcher);
    const products = await listAdminProducts({ status: "reserved", active: false });
    expect(products.map((item) => item.id)).toEqual([product.id, "kedua"]);
    expect(products[0]?.images).toEqual([`${API_URL}/uploads/products/uji.png`]);
    expect(fetcher.mock.calls.map(([url]) => new URL(url as string).search)).toEqual([
      "?page=1&limit=100&status=reserved&active=false",
      "?page=2&limit=100&status=reserved&active=false",
    ]);
    expect(new Request(...fetcher.mock.calls[0]!).headers.get("Authorization")).toBe(
      "Bearer admin-token",
    );
  });

  it("detail Admin memakai endpoint privat termasuk barang nonaktif", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => reply({ ...product, active: false }));
    vi.stubGlobal("fetch", fetcher);
    expect((await getAdminProduct(product.id)).active).toBe(false);
    expect(fetcher.mock.calls[0]?.[0]).toBe(`${API_URL}/api/admin/products/${product.id}`);
  });

  it("POST/PATCH produk hanya mengirim field produk yang bisa diedit", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => reply(product, 201));
    vi.stubGlobal("fetch", fetcher);
    await saveProduct(product);
    await saveProduct(product, product.id);
    const { name, brand, category, style, color, size, condition, measurements, price, images } =
      product;
    const expected = {
      name,
      brand,
      category,
      style,
      color,
      size,
      condition,
      measurements,
      price,
      images,
    };
    for (const call of fetcher.mock.calls)
      expect(await new Request(...call).json()).toEqual(expected);
    expect(fetcher.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
      [`${API_URL}/api/products`, "POST"],
      [`${API_URL}/api/products/${product.id}`, "PATCH"],
    ]);
  });

  it("nonaktif lewat DELETE, aktif lewat PATCH; konflik stok tetap 409", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reply(product))
      .mockResolvedValueOnce(reply(product))
      .mockResolvedValueOnce(failure(409, "PRODUCT_LOCKED"));
    vi.stubGlobal("fetch", fetcher);
    await setProductActive(product.id, false);
    await setProductActive(product.id, true);
    expect(fetcher.mock.calls[0]?.[1]?.method).toBe("DELETE");
    expect(await new Request(...fetcher.mock.calls[1]!).json()).toEqual({ active: true });
    await expect(setProductActive(product.id, false)).rejects.toMatchObject({
      status: 409,
      code: "PRODUCT_LOCKED",
    });
  });

  it("foto dikirim sebagai multipart images dan urutan foto utama dipertahankan", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      reply(["/uploads/products/utama.png", "/uploads/products/detail.jpg"], 201),
    );
    vi.stubGlobal("fetch", fetcher);
    const paths = await uploadProductImages([
      new File(["png"], "utama.png", { type: "image/png" }),
      new File(["jpg"], "detail.jpg", { type: "image/jpeg" }),
    ]);
    const request = new Request(...fetcher.mock.calls[0]!);
    expect(request.url).toBe(`${API_URL}/api/admin/product-images`);
    expect(request.headers.get("Content-Type")).toMatch(/^multipart\/form-data; boundary=/);
    const form = await request.formData();
    expect([...form.keys()]).toEqual(["images", "images"]);
    expect(form.getAll("images").map((file) => (file as File).name)).toEqual([
      "utama.png",
      "detail.jpg",
    ]);
    expect(paths).toEqual([
      `${API_URL}/uploads/products/utama.png`,
      `${API_URL}/uploads/products/detail.jpg`,
    ]);
  });

  it("menolak jumlah, tipe, dan ukuran berkas sebelum unggah", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const png = new File(["png"], "uji.png", { type: "image/png" });
    for (const files of [
      [],
      [png, png, png, png, png],
      [new File(["x"], "uji.txt", { type: "text/plain" })],
      [new File([new Uint8Array(2 * 1024 * 1024 + 1)], "besar.png", { type: "image/png" })],
    ])
      await expect(uploadProductImages(files)).rejects.toMatchObject({ status: 422 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("galat ID dan jaringan tetap ditangani tanpa data lokal cadangan", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => failure(422, "VALIDATION_ERROR")),
    );
    await expect(getAdminProduct("id-lama")).rejects.toMatchObject({ status: 404 });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("offline");
      }),
    );
    await expect(listAdminProducts()).rejects.toMatchObject({ status: 0 });
  });
});

describe("pesanan Admin dari API", () => {
  it("memakai metadata root untuk pagination dan counts global saat status difilter", async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: [dto],
            counts,
            total: 75,
            page: 2,
            limit: 20,
            totalPages: 4,
          }),
        ),
    );
    vi.stubGlobal("fetch", fetcher);
    const page = await listAdminOrders({ status: "MENUNGGU_VERIFIKASI", page: 2 });
    expect(page).toMatchObject({
      counts,
      total: 75,
      page: 2,
      limit: 20,
      totalPages: 4,
      items: [{ version: 3, totalPrice: 123456, buyerEmail: "buyer.uji@pickathrift.test" }],
    });
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      `${API_URL}/api/admin/orders?page=2&limit=20&status=MENUNGGU_VERIFIKASI`,
    );
  });

  it("lencana memakai counts BE, bukan panjang daftar yang dibatasi limit", async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: [],
            counts,
            total: 102,
            page: 1,
            limit: 1,
            totalPages: 102,
          }),
        ),
    );
    vi.stubGlobal("fetch", fetcher);
    expect(await countPendingOrders()).toBe(75);
    expect(fetcher.mock.calls[0]?.[0]).toBe(`${API_URL}/api/admin/orders?page=1&limit=1`);
  });

  it("detail memakai endpoint pesanan bersama dan mempertahankan versi serta URL bukti privat", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => reply(dto));
    vi.stubGlobal("fetch", fetcher);
    expect(await getAdminOrder(dto.id)).toMatchObject({
      version: 3,
      proof: { id: dto.proof!.id, url: dto.proof!.url },
    });
    expect(fetcher.mock.calls[0]?.[0]).toBe(`${API_URL}/api/orders/${dto.id}`);
  });

  it.each<AdminOrderAction>([
    { type: "approve" },
    { type: "reupload", note: " Foto buram " },
    { type: "reject", note: " Tidak ada dana masuk " },
    { type: "ship", service: "JNE REG", number: " UJI-123456 " },
  ])("aksi $type mengirim versi yang dilihat Admin dan field sesuai kontrak", async (action) => {
    const fetcher = vi.fn<typeof fetch>(async () => reply({ ...dto, version: 4 }));
    vi.stubGlobal("fetch", fetcher);
    const before = adminOrderRevision.get();
    const updated = await updateAdminOrder(fromApiOrder(dto), action);
    const request = new Request(...fetcher.mock.calls[0]!);
    expect(request.url).toBe(`${API_URL}/api/admin/orders/${dto.id}/actions`);
    const expected =
      action.type === "ship"
        ? { version: 3, type: "ship", service: "JNE REG", number: "UJI-123456" }
        : {
            version: 3,
            type: action.type,
            proofId: dto.proof!.id,
            ...(action.type === "approve" ? {} : { note: action.note.trim() }),
          };
    expect(await request.json()).toEqual(expected);
    expect(updated.version).toBe(4);
    expect(adminOrderRevision.get()).toBe(before + 1);
  });

  it("STALE_ORDER tidak dimuat ulang atau dikirim ulang otomatis", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => failure(409, "STALE_ORDER"));
    vi.stubGlobal("fetch", fetcher);
    const order = fromApiOrder(dto);
    const revision = adminOrderRevision.get();
    await expect(updateAdminOrder(order, { type: "approve" })).rejects.toMatchObject({
      status: 409,
      code: "STALE_ORDER",
    });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(order.version).toBe(3);
    expect(adminOrderRevision.get()).toBe(revision);
  });

  it("versi atau identitas bukti yang hilang meminta muat ulang sebelum menulis", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(
      updateAdminOrder({ ...fromApiOrder(dto), version: undefined }, { type: "approve" }),
    ).rejects.toMatchObject({ code: "STALE_ORDER" });
    await expect(
      updateAdminOrder({ ...fromApiOrder(dto), proof: undefined }, { type: "approve" }),
    ).rejects.toMatchObject({ code: "PROOF_UNAVAILABLE" });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
