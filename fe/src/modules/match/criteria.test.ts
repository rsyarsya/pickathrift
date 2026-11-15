import { describe, expect, it } from "vitest";
import { bodyFields, formFromParams, validate } from "@/modules/match/criteria";

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
});
