import { describe, expect, it } from "vitest";
import { PRODUCTS } from "@/modules/catalog/data/fixtures";
import { applyAdminAction, trackingError } from "@/modules/admin/orderActions";
import type { Order, OrderStatus } from "@/modules/orders/order";
import { DEMO_ADDRESS } from "@/modules/profile/data/fixtures";

const order = (status: OrderStatus): Order => ({
  id: "PCT-TEST",
  buyerEmail: "buyer@pickathrift.test",
  product: PRODUCTS[0]!,
  address: DEMO_ADDRESS,
  createdAt: 0,
  expiresAt: 1,
  status,
});

describe("aksi admin pada pesanan", () => {
  it("menerima bukti dari Menunggu verifikasi dan Perlu unggah ulang", () => {
    expect(applyAdminAction(order("MENUNGGU_VERIFIKASI"), { type: "approve" }, 5).status).toBe(
      "DIPROSES",
    );
    expect(applyAdminAction(order("PERLU_UNGGAH_ULANG"), { type: "approve" }, 5).status).toBe(
      "DIPROSES",
    );
  });

  it("menolak transisi yang tidak diizinkan dengan 409", () => {
    expect(() => applyAdminAction(order("DIPROSES"), { type: "reject", note: "x" }, 5)).toThrow(
      /Status pesanan sudah berubah/,
    );
    expect(() =>
      applyAdminAction(order("PERLU_UNGGAH_ULANG"), { type: "reupload", note: "x" }, 5),
    ).toThrow();
  });

  it("menyimpan resi hanya kalau nomornya valid", () => {
    expect(trackingError("")).toMatch(/wajib/);
    const shipped = applyAdminAction(
      order("DIPROSES"),
      { type: "ship", service: "JNE REG", number: " JNE 0123 4567 " },
      9,
    );
    expect(shipped.status).toBe("DIKIRIM");
    expect(shipped.shipment).toEqual({ service: "JNE REG", number: "JNE 0123 4567", shippedAt: 9 });
  });
});
