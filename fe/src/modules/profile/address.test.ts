import { expect, it } from "vitest";
import { validateAddress, validateProfile } from "./address";

it("memvalidasi nomor HP Indonesia dan kode pos sambil menerima spasi pemisah", () => {
  const valid = {
    name: "Dinda",
    accountPhone: "",
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

const emptyProfile = {
  name: "Buyer Uji",
  accountPhone: "",
  recipient: "",
  phone: "",
  street: "",
  city: "",
  postalCode: "",
};

it("profil tanpa alamat boleh disimpan, tetapi alamat parsial dan pengosongan alamat lama ditolak", () => {
  expect(validateProfile(emptyProfile)).toEqual({});
  expect(validateProfile({ ...emptyProfile, recipient: "Penerima Uji" })).toHaveProperty("street");
  expect(validateProfile(emptyProfile, true)).toHaveProperty("recipient");
  expect(validateProfile({ ...emptyProfile, name: " " })).toHaveProperty("name");
  expect(validateProfile({ ...emptyProfile, accountPhone: "+6281234567890" })).toHaveProperty(
    "accountPhone",
  );
});

it("memvalidasi batas nomor HP dan panjang alamat sesuai kontrak API", () => {
  const valid = {
    recipient: "Penerima Uji",
    phone: "0812345678",
    street: "Jl. Uji",
    city: "Kota Uji",
    postalCode: "12345",
  };
  expect(validateAddress(valid)).toEqual({});
  expect(validateAddress({ ...valid, phone: "0812345678901" })).toEqual({});
  for (const phone of ["081234567", "08123456789012", "6281234567890", "+6281234567890"])
    expect(validateAddress({ ...valid, phone })).toHaveProperty("phone");
  expect(
    validateAddress({
      ...valid,
      recipient: "x".repeat(101),
      street: "x".repeat(1001),
      city: "x".repeat(101),
    }),
  ).toMatchObject({
    recipient: expect.any(String),
    street: expect.any(String),
    city: expect.any(String),
  });
});
