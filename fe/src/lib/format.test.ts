import { describe, expect, it } from "vitest";
import { formatRupiah, parseRupiah, uploadedAgo } from "@/lib/format";

describe("format", () => {
  it("menulis rupiah dengan titik ribuan", () => {
    expect(formatRupiah(185000)).toBe("Rp 185.000");
    expect(formatRupiah(0)).toBe("Rp 0");
  });

  it("membaca rupiah dari teks bebas", () => {
    expect(parseRupiah("Rp 250.000")).toBe(250000);
    expect(parseRupiah("  ")).toBeNull();
  });

  it("menghitung umur unggahan", () => {
    const now = new Date("2026-11-11T12:00:00Z").getTime();
    expect(uploadedAgo("2026-11-11T08:00:00Z", now)).toBe("HARI INI");
    expect(uploadedAgo("2026-11-08T12:00:00Z", now)).toBe("3 HARI LALU");
    expect(uploadedAgo("2026-08-01T12:00:00Z", now)).toBe("3 BULAN LALU");
  });
});
