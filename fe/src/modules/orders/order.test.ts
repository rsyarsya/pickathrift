import { describe, expect, it } from "vitest";
import { formatCountdown, paymentSeconds, PROOF_MAX_BYTES, validateProof } from "./order";

const createdAt = 1_000;
const expiresAt = createdAt + 6 * 60 * 60 * 1_000;
const order = { expiresAt, status: "MENUNGGU_PEMBAYARAN" } as const;

describe("aturan checkout", () => {
  it("menghitung sisa waktu hingga batas pembayaran dari API", () => {
    expect(formatCountdown(paymentSeconds(order, createdAt)!)).toBe("06:00:00");
    expect(paymentSeconds(order, expiresAt - 1)).toBe(1);
    expect(paymentSeconds(order, expiresAt)).toBe(0);
    expect(paymentSeconds(order, expiresAt + 1000)).toBe(0);
  });

  it("menyembunyikan hitung mundur saat verifikasi atau unggah ulang", () => {
    expect(paymentSeconds({ expiresAt, status: "PERLU_UNGGAH_ULANG" }, expiresAt)).toBeNull();
    expect(paymentSeconds({ expiresAt, status: "MENUNGGU_VERIFIKASI" }, expiresAt)).toBeNull();
  });

  it("memvalidasi format gambar dan batas ukuran bukti", () => {
    expect(validateProof({ type: "image/png", size: PROOF_MAX_BYTES })).toBeUndefined();
    expect(validateProof({ type: "image/jpeg", size: PROOF_MAX_BYTES + 1 })).toBeDefined();
    expect(validateProof({ type: "image/heic", size: 1 })).toBeDefined();
  });
});
