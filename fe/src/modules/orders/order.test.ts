import { describe, expect, it } from "vitest";
import { validateAddress } from "@/modules/profile/address";
import {
  buyerOrderAction,
  expireOrder,
  formatCountdown,
  paymentExpiry,
  paymentSeconds,
  PROOF_MAX_BYTES,
  validateProof,
  type Order,
} from "./order";

const address = {
  recipient: "Dinda",
  phone: "0812 3456 7890",
  street: "Jl. Kaliurang 12",
  city: "Yogyakarta",
  postalCode: "55281",
};

const product: Order["product"] = {
  id: "jacket",
  name: "Jaket",
  brand: "PickaThrift",
  category: "Jaket",
  size: "L",
  condition: "Baik",
  style: "Kasual",
  color: "Hijau",
  price: 185_000,
  status: "available",
  images: [],
  measurements: [],
  createdAt: "",
};

const createdAt = 1_000;
const order: Order = {
  id: "PCT-test",
  buyerEmail: "buyer@pickathrift.test",
  product,
  address,
  createdAt,
  expiresAt: paymentExpiry(createdAt),
  status: "MENUNGGU_PEMBAYARAN",
};

describe("aturan checkout", () => {
  it("membatalkan pesanan yang belum dibayar tepat setelah enam jam", () => {
    expect(formatCountdown(paymentSeconds(order, createdAt)!)).toBe("06:00:00");
    expect(paymentSeconds(order, order.expiresAt - 1)).toBe(1);
    expect(buyerOrderAction(order, "cancel", order.expiresAt - 1)).toBe(true);
    expect(buyerOrderAction(order, "upload", order.expiresAt)).toBe(false);
    expect(buyerOrderAction(order, "cancel", order.expiresAt)).toBe(false);
    expect(expireOrder(order, order.expiresAt)).toMatchObject({
      status: "DIBATALKAN",
      cancellation: "expired",
    });
  });

  it("mengizinkan unggah ulang setelah enam jam tanpa hitung mundur atau pembatalan Buyer", () => {
    const reupload = { ...order, status: "PERLU_UNGGAH_ULANG" } as const;
    const verifying = { ...order, status: "MENUNGGU_VERIFIKASI" } as const;
    expect(paymentSeconds(reupload, order.expiresAt)).toBeNull();
    expect(expireOrder(reupload, order.expiresAt)).toBe(reupload);
    expect(expireOrder(verifying, order.expiresAt)).toBe(verifying);
    expect(buyerOrderAction(reupload, "upload", order.expiresAt)).toBe(true);
    expect(buyerOrderAction(reupload, "cancel", order.expiresAt)).toBe(false);
    expect(buyerOrderAction(verifying, "upload", order.expiresAt)).toBe(false);
  });

  it("memvalidasi alamat pengiriman, format gambar, dan batas ukuran bukti", () => {
    expect(validateAddress(address)).toEqual({});
    expect(Object.keys(validateAddress({ ...address, phone: "", postalCode: "552" }))).toEqual([
      "phone",
      "postalCode",
    ]);
    expect(validateProof({ type: "image/png", size: PROOF_MAX_BYTES })).toBeUndefined();
    expect(validateProof({ type: "image/jpeg", size: PROOF_MAX_BYTES + 1 })).toBeDefined();
    expect(validateProof({ type: "image/heic", size: 1 })).toBeDefined();
  });

  it("membatasi konfirmasi diterima ke pesanan yang dikirim", () => {
    expect(buyerOrderAction(order, "receive", createdAt)).toBe(false);
    expect(buyerOrderAction({ ...order, status: "DIPROSES" }, "receive", createdAt)).toBe(false);
    expect(buyerOrderAction({ ...order, status: "DIKIRIM" }, "receive", order.expiresAt)).toBe(
      true,
    );
    expect(buyerOrderAction({ ...order, status: "SELESAI" }, "receive", createdAt)).toBe(false);
  });
});
