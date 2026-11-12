import { expect, it } from "vitest";
import { validateProfile } from "./address";

it("memvalidasi nomor HP Indonesia dan kode pos sambil menerima spasi pemisah", () => {
  const valid = {
    recipient: "Dinda",
    phone: "0812 3456 7890",
    street: "Jl. Kaliurang",
    city: "Yogyakarta",
    postalCode: "55281",
  };
  expect(validateProfile(valid)).toEqual({});
  expect(validateProfile({ ...valid, phone: "0812 34", postalCode: "55a81" })).toEqual({
    phone: "Nomor HP 10 sampai 13 angka, diawali 08.",
    postalCode: "Hanya angka, 5 digit.",
  });
  expect(validateProfile({ ...valid, recipient: "", phone: "99123456789" })).toHaveProperty(
    "phone",
  );
});
