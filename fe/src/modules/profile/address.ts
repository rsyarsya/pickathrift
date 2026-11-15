export type ShippingAddress = {
  recipient: string;
  phone: string;
  street: string;
  city: string;
  postalCode: string;
};

export type ProfileValues = ShippingAddress & { name: string; accountPhone: string };

export function hasAddress(address: ShippingAddress) {
  return [address.recipient, address.phone, address.street, address.city, address.postalCode].some(
    (value) => value.trim() !== "",
  );
}

export function validateAddress(address: ShippingAddress) {
  const errors: Partial<Record<keyof ShippingAddress, string>> = {};
  if (!address.recipient.trim()) errors.recipient = "Nama penerima wajib diisi.";
  else if (address.recipient.trim().length > 100) errors.recipient = "Maksimal 100 karakter.";
  const phone = address.phone.trim().replace(/[\s()-]/g, "");
  if (!phone) errors.phone = "Nomor HP wajib diisi, kurir akan menghubungi nomor ini.";
  else if (!/^08\d{8,11}$/.test(phone) || address.phone.trim().length > 30)
    errors.phone = "Nomor HP 10 sampai 13 angka, diawali 08.";
  if (!address.street.trim()) errors.street = "Alamat lengkap wajib diisi.";
  else if (address.street.trim().length > 1000) errors.street = "Maksimal 1.000 karakter.";
  if (!address.city.trim()) errors.city = "Kota wajib diisi.";
  else if (address.city.trim().length > 100) errors.city = "Maksimal 100 karakter.";
  if (!/^\d{5}$/.test(address.postalCode.trim())) errors.postalCode = "Kode pos 5 angka.";
  return errors;
}

export function validateProfile(values: ProfileValues, requireAddress = false) {
  const errors: Partial<Record<keyof ProfileValues, string>> =
    requireAddress || hasAddress(values) ? validateAddress(values) : {};
  if (!values.name.trim()) errors.name = "Nama lengkap wajib diisi.";
  else if (values.name.trim().length > 100) errors.name = "Maksimal 100 karakter.";
  const phone = values.accountPhone.trim().replace(/[\s()-]/g, "");
  if (phone && (!/^08\d{8,11}$/.test(phone) || values.accountPhone.trim().length > 30))
    errors.accountPhone = "Nomor HP 10 sampai 13 angka, diawali 08.";
  if (errors.postalCode) errors.postalCode = "Hanya angka, 5 digit.";
  return errors;
}
