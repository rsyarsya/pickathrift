import { afterEach, describe, expect, it, vi } from "vitest";
import { API_URL } from "@/lib/env";
import { PRODUCTS } from "@/test/products";
import {
  findMatches,
  getProduct,
  listProducts,
  listProductsByIds,
} from "@/modules/catalog/data/products";
import { EMPTY_QUERY } from "@/modules/catalog/query";

afterEach(() => vi.unstubAllGlobals());

function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: status < 400, data }), { status });
}

describe("produk dari API", () => {
  it("mengirim filter API, mempertahankan counts dan stok backend, serta menerjemahkan foto unggahan", async () => {
    const counts = { Semua: 9, Jaket: 3, Kaos: 2, Kemeja: 2, Celana: 2 };
    const product = {
      ...PRODUCTS[0]!,
      status: "reserved",
      images: ["/uploads/products/uji.png", "/products/fixture.jpg"],
    };
    const fetchMock = vi.fn<typeof fetch>(async () =>
      reply({ items: [product], total: 1, counts, page: 1, limit: 6, totalPages: 1 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await listProducts(
      {
        ...EMPTY_QUERY,
        category: "Jaket",
        sizes: ["M", "L"],
        conditions: ["Baik"],
        minPrice: 0,
        maxPrice: 200000,
        availableOnly: true,
        sort: "termurah",
        q: "denim",
      },
      6,
    );
    const url = new URL(fetchMock.mock.calls[0]![0] as string);
    expect(url.pathname).toBe("/api/products");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: "denim",
      category: "Jaket",
      sizes: "M,L",
      conditions: "Baik",
      minPrice: "0",
      maxPrice: "200000",
      availableOnly: "true",
      sort: "termurah",
      page: "1",
      limit: "6",
    });
    expect(result.counts).toEqual(counts);
    expect(result.items[0]).toMatchObject({
      status: "reserved",
      images: [`${API_URL}/uploads/products/uji.png`, "/products/fixture.jpg"],
    });
  });

  it("memakai halaman tambahan saat muat lebih banyak melewati 100 barang", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      const page = Number(new URL(input).searchParams.get("page"));
      return reply({
        items: Array.from({ length: 100 }, (_, i) => ({
          ...PRODUCTS[0]!,
          id: String((page - 1) * 100 + i),
        })),
        total: 230,
        counts: {},
        page,
        limit: 100,
        totalPages: 3,
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await listProducts(EMPTY_QUERY, 102);
    expect(result.items).toHaveLength(102);
    expect(result.items[101]?.id).toBe("101");
    expect(fetchMock.mock.calls.map(([url]) => new URL(url).search)).toEqual([
      "?sort=terbaru&page=1&limit=100",
      "?sort=terbaru&page=2&limit=100",
    ]);
  });

  it.each([404, 422])("menampilkan barang tidak ditemukan untuk HTTP %i", async (status) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => reply(null, status)),
    );
    await expect(getProduct("id-lama")).rejects.toMatchObject({ status: 404 });
  });

  it("memuat per ID sesuai urutan dan melewati ID lama atau produk yang dihapus", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      const id = input.split("/").at(-1);
      return id === "lama"
        ? reply(null, 422)
        : id === "hilang"
          ? reply(null, 404)
          : reply({ ...PRODUCTS[0]!, id });
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(listProductsByIds(["kedua", "lama", "hilang", "pertama"])).resolves.toMatchObject([
      { id: "kedua" },
      { id: "pertama" },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("tidak menyembunyikan galat server atau jaringan pada tray perbandingan", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => reply(null, 503)),
    );
    await expect(listProductsByIds(["uji"])).rejects.toMatchObject({ status: 503 });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("offline");
      }),
    );
    await expect(listProductsByIds(["uji"])).rejects.toMatchObject({ status: 0 });
  });

  it("mengembalikan katalog kosong dan daftar ID kosong", async () => {
    const fetchMock = vi.fn(async () => reply({ items: [], total: 0, counts: {} }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(listProducts(EMPTY_QUERY, 6)).resolves.toMatchObject({ items: [], total: 0 });
    await expect(listProductsByIds([])).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("pencocokan dari API", () => {
  it("mengirim body kontrak API dan mempertahankan urutan serta skor dari server", async () => {
    const matches = [
      {
        product: { ...PRODUCTS[0]!, id: "pertama", images: ["/uploads/products/uji.png"] },
        diffCm: 1.5,
      },
      { product: { ...PRODUCTS[1]!, id: "kedua" }, diffCm: 0 },
    ];
    const fetchMock = vi.fn<typeof fetch>(async () => reply(matches));
    vi.stubGlobal("fetch", fetchMock);
    const result = await findMatches({
      category: "Jaket",
      style: "Workwear",
      size: "L",
      minPrice: 0,
      maxPrice: 200000,
      body: { dada: 58.5, bahu: 46 },
    });
    const request = new Request(...fetchMock.mock.calls[0]!);
    expect(request.url).toBe(`${API_URL}/api/products/match`);
    expect(request.method).toBe("POST");
    expect(request.headers.get("Content-Type")).toBe("application/json");
    expect(await request.json()).toEqual({
      category: "Jaket",
      style: "Workwear",
      size: "L",
      minPrice: 0,
      maxPrice: 200000,
      measurements: [
        { label: "Lebar dada", cm: 58.5 },
        { label: "Bahu", cm: 46 },
      ],
    });
    expect(result).toEqual([
      {
        ...matches[0],
        product: { ...matches[0]!.product, images: [`${API_URL}/uploads/products/uji.png`] },
      },
      matches[1],
    ]);
  });

  it("meneruskan hasil kosong tanpa pengukuran", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => reply([])),
    );
    await expect(findMatches({ category: "Kaos", body: {} })).resolves.toEqual([]);
  });

  it("meneruskan galat validasi dari backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              code: "VALIDATION_ERROR",
              message: "Periksa kembali isian.",
              errors: { category: "Jenis pakaian wajib diisi." },
            }),
            { status: 422 },
          ),
      ),
    );
    await expect(findMatches({ body: {} })).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      errors: { category: "Jenis pakaian wajib diisi." },
    });
  });

  it("meneruskan jaringan putus ke state galat layar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("offline");
      }),
    );
    await expect(findMatches({ category: "Jaket", body: {} })).rejects.toMatchObject({ status: 0 });
  });
});
