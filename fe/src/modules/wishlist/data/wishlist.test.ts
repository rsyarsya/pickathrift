import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_URL } from "@/lib/env";
import { setToken } from "@/lib/auth-token";
import { authState, logout } from "@/modules/auth/lib/auth-service";
import { PRODUCTS } from "@/test/products";
import { loadWishlist, setWishlistSaved, wishlistState } from "./wishlist";

const item = {
  id: "wishlist-1",
  productId: "product-1",
  product_id: { ...PRODUCTS[0]!, id: "product-1", images: ["/uploads/products/uji.png"] },
  unavailable: false,
  createdAt: "2026-11-16T00:00:00.000Z",
};
const unavailable = {
  ...item,
  id: "wishlist-2",
  productId: "product-2",
  product_id: null,
  unavailable: true,
};
const buyer = {
  id: "buyer-1",
  name: "Buyer Uji",
  email: "buyer.uji@pickathrift.test",
  role: "buyer" as const,
};

function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: status < 400, data }), { status });
}

function signIn(id = buyer.id) {
  setToken(`token-${id}`);
  authState.set({ user: { ...buyer, id }, lastActiveAt: Date.now() });
}

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
  logout();
  signIn();
});
afterEach(() => {
  logout();
  vi.unstubAllGlobals();
});

describe("wishlist API dan cache sesi", () => {
  it("membagi satu GET, memakai Bearer, dan mempertahankan barang tidak tersedia", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => reply([item, unavailable]));
    vi.stubGlobal("fetch", fetcher);
    await Promise.all([loadWishlist(), loadWishlist(), loadWishlist()]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const request = new Request(...fetcher.mock.calls[0]!);
    expect(request.url).toBe(`${API_URL}/api/wishlist`);
    expect(request.headers.get("Authorization")).toBe("Bearer token-buyer-1");
    expect(wishlistState.get()).toMatchObject({
      status: "success",
      items: [{ product_id: { images: [`${API_URL}/uploads/products/uji.png`] } }, unavailable],
    });
  });

  it("menyimpan lewat POST dan menghapus lewat DELETE tanpa mengubah state sebelum sukses", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reply([]))
      .mockResolvedValueOnce(reply(item, 201))
      .mockResolvedValueOnce(reply({ id: item.id }));
    vi.stubGlobal("fetch", fetcher);
    await loadWishlist();
    const saving = setWishlistSaved(item.productId, true);
    expect(wishlistState.get().items).toEqual([]);
    await saving;
    expect(wishlistState.get().items[0]?.productId).toBe(item.productId);
    const post = new Request(...fetcher.mock.calls[1]!);
    expect(post.headers.get("Content-Type")).toBe("application/json");
    expect(await post.json()).toEqual({});
    await setWishlistSaved(item.productId, false);
    expect(wishlistState.get().items).toEqual([]);
    expect(fetcher.mock.calls.map(([url, init]) => [url, init?.method ?? "GET"])).toEqual([
      [`${API_URL}/api/wishlist`, "GET"],
      [`${API_URL}/api/wishlist/${item.productId}`, "POST"],
      [`${API_URL}/api/wishlist/${item.productId}`, "DELETE"],
    ]);
  });

  it("klik simpan ganda hanya menulis satu kali", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reply([]))
      .mockResolvedValueOnce(reply(item, 201));
    vi.stubGlobal("fetch", fetcher);
    await Promise.all([
      setWishlistSaved(item.productId, true),
      setWishlistSaved(item.productId, true),
    ]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(wishlistState.get().items).toHaveLength(1);
  });

  it("memuat ulang setelah POST 409 karena barang sudah tersimpan di tab lain", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reply([]))
      .mockResolvedValueOnce(reply(null, 409))
      .mockResolvedValueOnce(reply([item]));
    vi.stubGlobal("fetch", fetcher);
    await setWishlistSaved(item.productId, true);
    expect(wishlistState.get().items[0]?.productId).toBe(item.productId);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("menghapus barang nonaktif melalui productId dan menerima DELETE 404 dari tab lain", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reply([unavailable]))
      .mockResolvedValueOnce(reply(null, 404));
    vi.stubGlobal("fetch", fetcher);
    await setWishlistSaved(unavailable.productId, false);
    expect(fetcher.mock.calls[1]?.[0]).toBe(`${API_URL}/api/wishlist/${unavailable.productId}`);
    expect(wishlistState.get().items).toEqual([]);
  });

  it("kegagalan mutasi mempertahankan isi dan antrean bisa menerima retry", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reply([item]))
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(reply({ id: item.id }));
    vi.stubGlobal("fetch", fetcher);
    await expect(setWishlistSaved(item.productId, false)).rejects.toMatchObject({ status: 0 });
    expect(wishlistState.get().items).toHaveLength(1);
    await setWishlistSaved(item.productId, false);
    expect(wishlistState.get().items).toEqual([]);
  });

  it("menyediakan state galat muat dan dapat dimuat ulang", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(reply([]));
    vi.stubGlobal("fetch", fetcher);
    await expect(loadWishlist()).rejects.toMatchObject({ status: 0 });
    expect(wishlistState.get()).toMatchObject({ status: "error", error: { status: 0 } });
    await loadWishlist(true);
    expect(wishlistState.get()).toMatchObject({ status: "success", items: [] });
    expect(wishlistState.get().error).toBeUndefined();
  });

  it("respons GET lama sesudah logout tidak mengisi cache kembali", async () => {
    let resolve!: (response: Response) => void;
    const response = new Promise<Response>((done) => {
      resolve = done;
    });
    const fetcher = vi.fn<typeof fetch>(() => response);
    vi.stubGlobal("fetch", fetcher);
    const request = loadWishlist();
    const rejected = expect(request).rejects.toMatchObject({ status: 401 });
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    logout();
    resolve(reply([item]));
    await rejected;
    expect(wishlistState.get()).toMatchObject({ sessionKey: null, items: [], status: "idle" });
  });

  it("respons POST akun lama tidak menimpa wishlist akun baru", async () => {
    let resolve!: (response: Response) => void;
    const response = new Promise<Response>((done) => {
      resolve = done;
    });
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reply([]))
      .mockImplementationOnce(() => response)
      .mockResolvedValueOnce(reply([unavailable]));
    vi.stubGlobal("fetch", fetcher);
    const request = setWishlistSaved(item.productId, true);
    const rejected = expect(request).rejects.toMatchObject({ status: 401 });
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    signIn("buyer-2");
    await loadWishlist();
    resolve(reply(item, 201));
    await rejected;
    expect(wishlistState.get()).toMatchObject({
      sessionKey: "buyer-2:token-buyer-2",
      items: [unavailable],
    });
  });

  it("401 membersihkan sesi dan wishlist", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reply([item]))
      .mockResolvedValueOnce(reply(null, 401));
    vi.stubGlobal("fetch", fetcher);
    await loadWishlist();
    await expect(setWishlistSaved(item.productId, false)).rejects.toMatchObject({ status: 401 });
    expect(wishlistState.get().items).toEqual([]);
    expect(authState.get().user).toBeNull();
  });

  it("pengunjung dan Admin tidak mengirim permintaan wishlist", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    logout();
    await expect(loadWishlist()).rejects.toMatchObject({ status: 401 });
    signIn();
    authState.set({ user: { ...buyer, role: "admin" }, lastActiveAt: Date.now() });
    await expect(setWishlistSaved(item.productId, true)).rejects.toMatchObject({ status: 401 });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
