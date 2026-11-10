import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";

function mockFetch(body: string, init: ResponseInit) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body, init)),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("api", () => {
  it("mengembalikan JSON saat sukses", async () => {
    mockFetch(JSON.stringify({ id: "p-1" }), { status: 200 });
    await expect(api("/produk/p-1")).resolves.toEqual({ id: "p-1" });
  });

  it("memakai pesan dari backend saat gagal", async () => {
    mockFetch(JSON.stringify({ message: "Barang sudah dipesan orang lain." }), { status: 409 });
    await expect(api("/pesanan")).rejects.toThrow("Barang sudah dipesan orang lain.");
  });

  it("tetap memberi pesan saat backend gagal tanpa body", async () => {
    mockFetch("", { status: 500 });
    await expect(api("/pesanan")).rejects.toMatchObject({ status: 500 });
  });

  it("membedakan jaringan putus dari galat HTTP", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    await expect(api("/produk")).rejects.toMatchObject({ status: 0 });
    await expect(api("/produk")).rejects.toBeInstanceOf(ApiError);
  });
});
