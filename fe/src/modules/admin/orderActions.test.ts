import { describe, expect, it } from "vitest";
import { canAdmin, trackingError } from "@/modules/admin/orderActions";

describe("aksi admin pada pesanan", () => {
  it("menampilkan aksi setujui saat menunggu verifikasi atau unggah ulang", () => {
    expect(canAdmin({ status: "MENUNGGU_VERIFIKASI" }, "approve")).toBe(true);
    expect(canAdmin({ status: "PERLU_UNGGAH_ULANG" }, "approve")).toBe(true);
  });

  it("hanya menawarkan aksi yang sesuai status", () => {
    expect(canAdmin({ status: "DIPROSES" }, "reject")).toBe(false);
    expect(canAdmin({ status: "PERLU_UNGGAH_ULANG" }, "reupload")).toBe(false);
    expect(canAdmin({ status: "DIPROSES" }, "ship")).toBe(true);
    expect(canAdmin({ status: "DIKIRIM" }, "ship")).toBe(false);
  });

  it("menerima nomor resi yang valid setelah memangkas spasi", () => {
    expect(trackingError("")).toMatch(/wajib/);
    expect(trackingError("JNE-1")).toMatch(/8–30 karakter/);
    expect(trackingError(" JNE 0123 4567 ")).toBeNull();
  });
});
