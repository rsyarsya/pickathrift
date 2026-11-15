import { describe, expect, it } from "vitest";
import {
  EMPTY_QUERY,
  parseQuery,
  toApiSearchParams,
  toSearchParams,
} from "@/modules/catalog/query";

describe("query katalog", () => {
  it("bolak-balik URL tanpa kehilangan filter", () => {
    const url = "kategori=Jaket&ukuran=M%2CL&kondisi=Baik&min=50000&tersedia=1&urut=termurah";
    expect(toSearchParams(parseQuery(new URLSearchParams(url))).toString()).toBe(url);
  });

  it("mengabaikan nilai URL yang tidak dikenal", () => {
    const query = parseQuery(new URLSearchParams("kategori=Topi&ukuran=XXL,M&min=-5&urut=acak"));
    expect(query).toEqual({ ...EMPTY_QUERY, sizes: ["M"] });
  });

  it("menerima ukuran pinggang celana dari URL (QA-003)", () => {
    const query = parseQuery(new URLSearchParams("kategori=Celana&ukuran=31"));
    expect(query.sizes).toEqual(["31"]);
    expect(toApiSearchParams(query, 6).get("sizes")).toBe("31");
  });
});
