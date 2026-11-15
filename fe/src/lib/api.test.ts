import { afterEach, describe, expect, it, vi } from "vitest";
import { api, apiData, ApiError } from "@/lib/api";

function mockFetch(body: string, init: ResponseInit) {
  const fetchMock = vi.fn<typeof fetch>(async () => new Response(body, init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("api", () => {
  it("membuka envelope dan meneruskan opsi permintaan", async () => {
    const fetchMock = mockFetch(JSON.stringify({ success: true, data: { id: "p-1" } }), {
      status: 201,
    });
    await expect(apiData("/api/products", { method: "POST", body: "{}" })).resolves.toEqual({
      id: "p-1",
    });
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
  });

  it("menyimpan kode konflik dan galat validasi backend", async () => {
    const errors = { name: "Nama wajib diisi." };
    mockFetch(JSON.stringify({ code: "VALIDATION_ERROR", message: "Periksa isian.", errors }), {
      status: 422,
    });
    await expect(apiData("/api/products")).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      errors,
    });
    mockFetch(JSON.stringify({ code: "STOCK_CONFLICT", message: "Stok sudah dipesan." }), {
      status: 409,
    });
    await expect(api("/api/orders")).rejects.toMatchObject({ status: 409, code: "STOCK_CONFLICT" });
  });

  it("mengembalikan JSON saat sukses", async () => {
    mockFetch(JSON.stringify({ id: "p-1" }), { status: 200 });
    await expect(api("/produk/p-1")).resolves.toEqual({ id: "p-1" });
  });

  it("mengirim body JSON dengan header tambahan dan kredensial", async () => {
    const fetchMock = mockFetch("{}", { status: 200 });
    const body = { productId: "p-1" };

    await api("/api/orders", {
      method: "POST",
      body: JSON.stringify(body),
      headers: new Headers({ "X-Request-Id": "order-1" }),
    });

    const request = new Request(...fetchMock.mock.calls[0]!);
    expect(request.headers.get("Content-Type")).toBe("application/json");
    expect(request.headers.get("X-Request-Id")).toBe("order-1");
    expect(request.credentials).toBe("omit");
    expect(await request.json()).toEqual(body);
  });

  it("membiarkan fetch membuat boundary multipart untuk unggahan", async () => {
    const fetchMock = mockFetch("{}", { status: 200 });
    const body = new FormData();
    body.set("proof", new File(["contoh"], "bukti.png", { type: "image/png" }));

    await api("/upload", {
      method: "POST",
      body,
      headers: { "Content-Type": "multipart/form-data" },
    });

    const request = new Request(...fetchMock.mock.calls[0]!);
    expect(request.headers.get("Content-Type")).toMatch(/^multipart\/form-data; boundary=/);
    const proof = (await request.formData()).get("proof");
    expect(proof).toMatchObject({ name: "bukti.png", type: "image/png" });
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
