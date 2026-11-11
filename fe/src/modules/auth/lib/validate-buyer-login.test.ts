import { describe, expect, it } from "vitest";
import { validateBuyerLogin } from "./validate-buyer-login";

describe("validasi login Buyer", () => {
  it("meminta kedua isian saat kosong", () => {
    expect(validateBuyerLogin({ email: "  ", password: "" })).toEqual({
      email: "Email wajib diisi.",
      password: "Kata sandi wajib diisi.",
    });
  });

  it.each(["dinda@gmail", "buyer.example.com", "buyer@@example.com", "buyer @example.com"])(
    "menolak format email %s",
    (email) => {
      const errors = validateBuyerLogin({ email, password: "sandi-ada" });
      expect(errors.email).toBe("Format email belum benar. Contoh: nama@email.com");
      expect(errors.password).toBeUndefined();
    },
  );

  it("menerima alamat dengan alias dan mengabaikan spasi luar email", () => {
    expect(
      validateBuyerLogin({ email: " buyer+thrift@mail.example.com ", password: "sandi-ada" }),
    ).toEqual({});
  });

  it("tidak menerapkan syarat panjang sandi registrasi saat login", () => {
    expect(validateBuyerLogin({ email: "buyer@example.com", password: "abc" })).toEqual({});
  });

  it("menandai hanya sandi saat email valid dan sandi kosong", () => {
    expect(validateBuyerLogin({ email: "buyer@example.com", password: "" })).toEqual({
      password: "Kata sandi wajib diisi.",
    });
  });

  it("tidak mengubah email atau spasi sandi milik pengguna", () => {
    const values = { email: " buyer@example.com ", password: " sandi dengan spasi " };
    const original = { ...values };
    expect(validateBuyerLogin(values)).toEqual({});
    expect(values).toEqual(original);
  });
});
