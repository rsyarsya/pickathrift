export type ShippingAddress = {
  recipient: string;
  phone: string;
  street: string;
  city: string;
  postalCode: string;
};

export function validateAddress(address: ShippingAddress) {
  const errors: Partial<Record<keyof ShippingAddress, string>> = {};
  if (!address.recipient.trim()) errors.recipient = "Nama penerima wajib diisi.";
  const phone = address.phone.trim().replace(/[\s()-]/g, "");
  if (!phone) errors.phone = "Nomor HP wajib diisi, kurir akan menghubungi nomor ini.";
  else if (!/^\+?\d{8,15}$/.test(phone)) errors.phone = "Masukkan nomor HP yang valid.";
  if (!address.street.trim()) errors.street = "Alamat lengkap wajib diisi.";
  if (!address.city.trim()) errors.city = "Kota wajib diisi.";
  if (!/^\d{5}$/.test(address.postalCode.trim())) errors.postalCode = "Kode pos 5 angka.";
  return errors;
}

export function validateProfile(address: ShippingAddress) {
  const errors = validateAddress(address);
  if (errors.recipient) errors.recipient = "Nama lengkap wajib diisi.";
  const phone = address.phone.trim().replace(/[\s()-]/g, "");
  if (phone && !/^08\d{8,11}$/.test(phone)) {
    errors.phone = "Nomor HP 10 sampai 13 angka, diawali 08.";
  }
  if (errors.postalCode) errors.postalCode = "Hanya angka, 5 digit.";
  return errors;
}
