export type ShippingAddress = {
  recipient: string;
  phone: string;
  street: string;
  city: string;
  postalCode: string;
};

export type ProfileValues = ShippingAddress & { name: string; accountPhone: string };

/** Batas panjang input; sama dengan aturan backend di be/lib/validation.js. */
export const FIELD_MAX = {
  name: 100,
  recipient: 100,
  phone: 20,
  accountPhone: 20,
  street: 1000,
  city: 100,
  postalCode: 5,
} as const;

export const PHONE_HINT = "Contoh: 0812 3456 7890 atau +62 812 3456 7890.";

const MESSAGES = {
  name: "Minimal 2 huruf. Hanya huruf, spasi, dan tanda . , ' -",
  phone: "Nomor HP 10 sampai 13 angka, diawali 08 atau +62.",
  street: "Tulis alamat lengkap: jalan, nomor rumah, RT/RW. Minimal 8 karakter.",
  city: "Nama kota hanya huruf, minimal 2 karakter.",
  postalCode: "Kode pos 5 angka, misalnya 55281.",
};

/** "+62 812-3456-7890" dan "62812…" disimpan seragam sebagai "0812…". */
export function normalizePhone(value: string) {
  const digits = value.trim().replace(/[\s().-]/g, "");
  if (digits.startsWith("+62")) return `0${digits.slice(3)}`;
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  return digits;
}

export const isPhone = (value: string) => /^08\d{8,11}$/.test(normalizePhone(value));

const PERSON = /^[\p{L}\p{M} .,'-]+$/u;
const CITY = /^[\p{L}\p{M} .,'()-]+$/u;

/** Nama orang atau kota: ada huruf, tanpa angka dan simbol lain. */
function isName(value: string, max: number, allowed = PERSON) {
  const text = value.trim();
  return text.length >= 2 && text.length <= max && /\p{L}/u.test(text) && allowed.test(text);
}

export function hasAddress(address: ShippingAddress) {
  return [address.recipient, address.phone, address.street, address.city, address.postalCode].some(
    (value) => value.trim() !== "",
  );
}

export function validateAddress(address: ShippingAddress) {
  const errors: Partial<Record<keyof ShippingAddress, string>> = {};
  if (!address.recipient.trim()) errors.recipient = "Nama penerima wajib diisi.";
  else if (!isName(address.recipient, FIELD_MAX.recipient)) errors.recipient = MESSAGES.name;
  if (!address.phone.trim())
    errors.phone = "Nomor HP wajib diisi, kurir akan menghubungi nomor ini.";
  else if (!isPhone(address.phone)) errors.phone = MESSAGES.phone;
  const street = address.street.trim();
  if (!street) errors.street = "Alamat lengkap wajib diisi.";
  else if (street.length < 8 || street.length > FIELD_MAX.street) errors.street = MESSAGES.street;
  if (!address.city.trim()) errors.city = "Kota wajib diisi.";
  else if (!isName(address.city, FIELD_MAX.city, CITY)) errors.city = MESSAGES.city;
  if (!/^[1-9]\d{4}$/.test(address.postalCode.trim())) errors.postalCode = MESSAGES.postalCode;
  return errors;
}

export function validateProfile(values: ProfileValues, requireAddress = false) {
  const errors: Partial<Record<keyof ProfileValues, string>> =
    requireAddress || hasAddress(values) ? validateAddress(values) : {};
  if (!values.name.trim()) errors.name = "Nama lengkap wajib diisi.";
  else if (!isName(values.name, FIELD_MAX.name)) errors.name = MESSAGES.name;
  if (values.accountPhone.trim() && !isPhone(values.accountPhone))
    errors.accountPhone = MESSAGES.phone;
  return errors;
}
