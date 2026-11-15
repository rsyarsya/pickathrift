import { describe, expect, it } from "vitest";
import {
  bodyFields,
  criteriaToParams,
  criteriaToRequest,
  formFromParams,
  validate,
} from "@/modules/match/criteria";

describe("kriteria Cari yang Cocok (QA-003)", () => {
  it("celana memakai ukuran pinggang dan kolom celana", () => {
    expect(bodyFields("Celana").map((f) => f.label)).toEqual(["Pinggang", "Panjang", "Lebar paha"]);
    const form = formFromParams(new URLSearchParams("jenis=Celana&ukuran=31&pinggang=40"));
    const result = validate(form);
    expect(result.ok && result.criteria).toMatchObject({ size: "31", body: { pinggang: 40 } });
  });

  it("isian kategori sebelumnya tidak ikut jadi filter", () => {
    const form = formFromParams(new URLSearchParams("jenis=Jaket&ukuran=L&dada=58&bahu=46"));
    const result = validate({ ...form, category: "Celana" });
    expect(result.ok && result.criteria).toMatchObject({ size: undefined, body: {} });
  });

  it("mengubah ukuran atasan menjadi label penuh tanpa ukuran celana", () => {
    expect(
      criteriaToRequest({
        category: "Jaket",
        style: "Workwear",
        size: "L",
        minPrice: 0,
        maxPrice: 200000,
        body: { dada: 58.5, panjang: 70, bahu: 46, pinggang: 40, paha: 28 },
      }),
    ).toEqual({
      category: "Jaket",
      style: "Workwear",
      size: "L",
      minPrice: 0,
      maxPrice: 200000,
      measurements: [
        { label: "Lebar dada", cm: 58.5 },
        { label: "Panjang", cm: 70 },
        { label: "Bahu", cm: 46 },
      ],
    });
  });

  it("mengubah ukuran celana dan mengabaikan kolom atasan", () => {
    const request = criteriaToRequest({
      category: "Celana",
      size: "31",
      body: { pinggang: 40, panjang: 100, paha: 28, dada: 58 },
    });
    expect(JSON.parse(JSON.stringify(request))).toEqual({
      category: "Celana",
      size: "31",
      measurements: [
        { label: "Pinggang", cm: 40 },
        { label: "Panjang", cm: 100 },
        { label: "Lebar paha", cm: 28 },
      ],
    });
  });

  it("mengizinkan pencarian tanpa pengukuran dan tanpa filter opsional", () => {
    expect(JSON.parse(JSON.stringify(criteriaToRequest({ category: "Kaos", body: {} })))).toEqual({
      category: "Kaos",
      measurements: [],
    });
  });

  it("mempertahankan URL Indonesia dan ukuran desimal ketika mengubah kriteria", () => {
    const criteria = { category: "Jaket" as const, size: "L" as const, body: { dada: 58.5 } };
    const result = validate(formFromParams(criteriaToParams(criteria)));
    expect(result.ok && result.criteria).toMatchObject(criteria);
  });

  it("menolak kategori kosong, budget terbalik, dan ukuran yang tidak valid", () => {
    const result = validate(
      formFromParams(new URLSearchParams("min=200000&max=100000&dada=abc&panjang=151")),
    );
    expect(result).toMatchObject({
      ok: false,
      errors: {
        category: expect.any(String),
        min: expect.any(String),
        dada: expect.any(String),
        panjang: expect.any(String),
      },
    });
  });
});
