import { expect, it } from "vitest";
import { buyerReturnPath } from "./return-path";

it("mengizinkan kembali ke rute Buyer lokal setelah masuk", () => {
  expect(
    buyerReturnPath("/checkout/507f1f77bcf86cd799439013?pesanan=507f1f77bcf86cd799439014"),
  ).toBe("/checkout/507f1f77bcf86cd799439013?pesanan=507f1f77bcf86cd799439014");
  expect(buyerReturnPath("/ulasan?pesanan=PCT-004")).toBe("/ulasan?pesanan=PCT-004");
  expect(buyerReturnPath("/profil")).toBe("/profil");
  expect(buyerReturnPath("//example.com/profil")).toBe("/");
  expect(buyerReturnPath("javascript:alert(1)")).toBe("/");
  expect(buyerReturnPath("/profil/../admin/masuk")).toBe("/");
});
