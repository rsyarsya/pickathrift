import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { PRODUCTS } from "@/test/products";
import { useProductActions } from "./useProductActions";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  show: vi.fn(),
  fail: vi.fn(),
  setSaved: vi.fn(),
  remove: vi.fn(),
  has: vi.fn(),
  compare: vi.fn(),
  loggedIn: true,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: null, show: mocks.show, fail: mocks.fail, clear: vi.fn() }),
}));
vi.mock("@/modules/wishlist/useWishlist", () => ({
  useWishlist: () => ({
    isLoggedIn: mocks.loggedIn,
    setSaved: mocks.setSaved,
    remove: mocks.remove,
    has: mocks.has,
  }),
}));
vi.mock("@/modules/compare/useCompare", () => ({ useCompare: () => ({ add: mocks.compare }) }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.loggedIn = true;
  mocks.has.mockReturnValue(false);
  mocks.setSaved.mockResolvedValue(undefined);
  mocks.remove.mockResolvedValue(undefined);
  vi.stubGlobal("window", {
    location: { pathname: "/katalog", search: "?kategori=Jaket", hash: "" },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("aksi wishlist", () => {
  it("hati pengunjung mengarah ke login dengan URL kembali tanpa menyimpan", () => {
    mocks.loggedIn = false;
    useProductActions().toggleWishlist(PRODUCTS[0]!);
    expect(mocks.push).toHaveBeenCalledWith(
      `/masuk?kembali=${encodeURIComponent("/katalog?kategori=Jaket")}`,
    );
    expect(mocks.setSaved).not.toHaveBeenCalled();
    expect(mocks.show).not.toHaveBeenCalled();
  });

  it("baru menampilkan sukses setelah API selesai", async () => {
    let resolve!: () => void;
    mocks.setSaved.mockReturnValueOnce(
      new Promise<void>((done) => {
        resolve = done;
      }),
    );
    useProductActions().toggleWishlist(PRODUCTS[0]!);
    expect(mocks.show).not.toHaveBeenCalled();
    resolve();
    await vi.waitFor(() =>
      expect(mocks.show).toHaveBeenCalledWith("✓ Disimpan ke wishlist", {
        label: "Lihat wishlist",
        href: "/wishlist",
      }),
    );
  });

  it("galat memakai fail dan retry mengulang tujuan simpan yang sama", async () => {
    mocks.setSaved.mockRejectedValueOnce(new ApiError(0, "Jaringan putus."));
    useProductActions().toggleWishlist(PRODUCTS[0]!);
    await vi.waitFor(() =>
      expect(mocks.fail).toHaveBeenCalledWith("Jaringan putus.", expect.any(Function)),
    );
    mocks.has.mockReturnValue(true);
    mocks.fail.mock.calls[0]![1]();
    await vi.waitFor(() => expect(mocks.setSaved).toHaveBeenCalledTimes(2));
    expect(mocks.setSaved.mock.calls).toEqual([
      [PRODUCTS[0]!.id, true],
      [PRODUCTS[0]!.id, true],
    ]);
  });

  it("simpan dari dialog tetap meminta saved=true dan penghapusan massal menangani galat", async () => {
    const actions = useProductActions();
    mocks.has.mockReturnValue(true);
    actions.saveToWishlist(PRODUCTS[0]!);
    expect(mocks.setSaved).toHaveBeenCalledWith(PRODUCTS[0]!.id, true);
    mocks.remove.mockRejectedValueOnce(new ApiError(503, "Gagal menghapus."));
    actions.removeFromWishlist(["terjual", "nonaktif"]);
    await vi.waitFor(() =>
      expect(mocks.fail).toHaveBeenCalledWith("Gagal menghapus.", expect.any(Function)),
    );
    mocks.fail.mock.calls[0]![1]();
    await vi.waitFor(() => expect(mocks.remove).toHaveBeenCalledTimes(2));
    expect(mocks.remove.mock.calls[1]).toEqual([["terjual", "nonaktif"]]);
  });

  it("aksi perbandingan tetap memakai penyimpanan perbandingan", () => {
    mocks.loggedIn = false;
    mocks.compare.mockReturnValue("added");
    useProductActions().compare(PRODUCTS[0]!);
    expect(mocks.compare).toHaveBeenCalledWith(PRODUCTS[0]);
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.setSaved).not.toHaveBeenCalled();
  });
});
