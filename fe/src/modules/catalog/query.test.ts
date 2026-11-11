import { describe, expect, it } from "vitest";
import { PRODUCTS } from "@/modules/catalog/data/fixtures";
import { applyQuery, EMPTY_QUERY, parseQuery, toSearchParams } from "@/modules/catalog/query";

describe("query katalog", () => {
  it("bolak-balik URL tanpa kehilangan filter", () => {
    const url = "kategori=Jaket&ukuran=M%2CL&kondisi=Baik&min=50000&tersedia=1&urut=termurah";
    expect(toSearchParams(parseQuery(new URLSearchParams(url))).toString()).toBe(url);
  });

  it("mengabaikan nilai URL yang tidak dikenal", () => {
    const query = parseQuery(new URLSearchParams("kategori=Topi&ukuran=XXL,M&min=-5&urut=acak"));
    expect(query).toEqual({ ...EMPTY_QUERY, sizes: ["M"] });
  });

  it("menyaring dan mengurutkan", () => {
    const result = applyQuery(PRODUCTS, {
      ...EMPTY_QUERY,
      category: "Jaket",
      availableOnly: true,
      sort: "termurah",
    });
    expect(result.every((p) => p.category === "Jaket" && p.status === "available")).toBe(true);
    expect(result.map((p) => p.price)).toEqual(
      [...result.map((p) => p.price)].sort((a, b) => a - b),
    );
  });

  it("mencari nama dan merek tanpa peduli huruf besar", () => {
    expect(applyQuery(PRODUCTS, { ...EMPTY_QUERY, q: "levi" }).map((p) => p.brand)).toEqual([
      "Levi's",
      "Levi's",
    ]);
  });
});
