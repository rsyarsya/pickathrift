import { expect, it } from "vitest";
import { normalizePhone, validateAddress, validateProfile } from "./address";

const validAddress = {
  recipient: "Dinda Ayu",
  phone: "0812 3456 7890",
  street: "Jl. Kaliurang Km 5",
  city: "Yogyakarta",
  postalCode: "55281",
};

it("memvalidasi nomor HP Indonesia dan kode pos sambil menerima spasi pemisah", () => {
  const valid = { name: "Dinda", accountPhone: "", ...validAddress };
  expect(validateProfile(valid)).toEqual({});
  expect(validateProfile({ ...valid, phone: "0812 34", postalCode: "55a81" })).toEqual({
    phone: "Nomor HP 10 sampai 13 angka, diawali 08 atau +62.",
    postalCode: "Kode pos 5 angka, misalnya 55281.",
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
  expect(validateProfile({ ...emptyProfile, accountPhone: "+62 812-3456-7890" })).toEqual({});
  expect(validateProfile({ ...emptyProfile, accountPhone: "abc" })).toHaveProperty("accountPhone");
});

it("menyeragamkan nomor +62 dan 62 menjadi 08", () => {
  expect(normalizePhone(" +62 812-3456-7890 ")).toBe("081234567890");
  expect(normalizePhone("62812.3456.7890")).toBe("081234567890");
  expect(normalizePhone("0812 (3456) 7890")).toBe("081234567890");
});

it("memvalidasi batas nomor HP dan panjang alamat sesuai kontrak API", () => {
  expect(validateAddress(validAddress)).toEqual({});
  expect(validateAddress({ ...validAddress, phone: "0812345678901" })).toEqual({});
  expect(validateAddress({ ...validAddress, phone: "6281234567890" })).toEqual({});
  for (const phone of ["081234567", "08123456789012", "+6512345678", "0812abc45678", "1234567890"])
    expect(validateAddress({ ...validAddress, phone })).toHaveProperty("phone");
  expect(
    validateAddress({
      ...validAddress,
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

it("menolak nama, kota, alamat, dan kode pos yang asal isi", () => {
  for (const recipient of ["a", "123", "!!!", "Budi99", "Budi_S"])
    expect(validateAddress({ ...validAddress, recipient })).toHaveProperty("recipient");
  for (const recipient of ["Siti Nur'aini", "R.A. Kartini", "Jean-Luc", "Ni Made Ayu"])
    expect(validateAddress({ ...validAddress, recipient })).toEqual({});
  for (const city of ["1", "12345", "Kota 7"])
    expect(validateAddress({ ...validAddress, city })).toHaveProperty("city");
  for (const city of ["Kab. Sleman", "Yogyakarta (DIY)"])
    expect(validateAddress({ ...validAddress, city })).toEqual({});
  for (const street of ["a", "Jl. 1"])
    expect(validateAddress({ ...validAddress, street })).toHaveProperty("street");
  expect(validateAddress({ ...validAddress, street: "Jl. Uji 1" })).toEqual({});
  for (const postalCode of ["00000", "05528", "5528", "552811"])
    expect(validateAddress({ ...validAddress, postalCode })).toHaveProperty("postalCode");
  expect(validateProfile({ ...emptyProfile, name: "x" })).toHaveProperty("name");
});
