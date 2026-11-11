import { describe, expect, it } from "vitest";
import { validateRegistration } from "./validate-registration";

const valid = {
  name: "Buyer Uji",
  email: "buyer@example.com",
  password: "Buyer123!",
  confirmPassword: "Buyer123!",
};

describe("validasi pendaftaran Buyer", () => {
  it("menerima empat isian valid", () => {
    expect(validateRegistration(valid)).toEqual({});
  });

  it("meminta nama yang bukan hanya spasi", () => {
    expect(validateRegistration({ ...valid, name: "  " }).name).toBeTruthy();
  });

  it("menolak email tanpa domain lengkap", () => {
    expect(validateRegistration({ ...valid, email: "buyer@gmail" }).email).toBeTruthy();
  });

  it("membedakan batas 7 dan 8 karakter sandi", () => {
    expect(
      validateRegistration({ ...valid, password: "1234567", confirmPassword: "1234567" }).password,
    ).toBeTruthy();
    expect(
      validateRegistration({ ...valid, password: "12345678", confirmPassword: "12345678" }),
    ).toEqual({});
  });

  it("meminta konfirmasi sandi dan menolak sandi yang berbeda", () => {
    expect(validateRegistration({ ...valid, confirmPassword: "" }).confirmPassword).toBeTruthy();
    expect(
      validateRegistration({ ...valid, confirmPassword: "beda1234" }).confirmPassword,
    ).toBeTruthy();
  });

  it("membandingkan sandi persis termasuk spasi dan kapital", () => {
    expect(
      validateRegistration({ ...valid, confirmPassword: " Buyer123! " }).confirmPassword,
    ).toBeTruthy();
    expect(
      validateRegistration({ ...valid, confirmPassword: "buyer123!" }).confirmPassword,
    ).toBeTruthy();
  });

  it("mengembalikan pesan untuk setiap isian kosong", () => {
    expect(
      Object.keys(
        validateRegistration({ name: "", email: "", password: "", confirmPassword: "" }),
      ).sort(),
    ).toEqual(["confirmPassword", "email", "name", "password"]);
  });
});
