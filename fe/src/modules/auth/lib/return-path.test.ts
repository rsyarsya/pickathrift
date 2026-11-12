import { expect, it } from "vitest";
import { buyerReturnPath } from "./return-path";

it("mengizinkan kembali ke rute Buyer lokal setelah masuk", () => {
  expect(buyerReturnPath("/checkout/work-jacket-olive?demo=alamat")).toBe(
    "/checkout/work-jacket-olive?demo=alamat",
  );
  expect(buyerReturnPath("/ulasan?pesanan=PCT-004")).toBe("/ulasan?pesanan=PCT-004");
  expect(buyerReturnPath("/profil")).toBe("/profil");
  expect(buyerReturnPath("//example.com/profil")).toBe("/");
  expect(buyerReturnPath("javascript:alert(1)")).toBe("/");
  expect(buyerReturnPath("/profil/../admin/masuk")).toBe("/");
});
