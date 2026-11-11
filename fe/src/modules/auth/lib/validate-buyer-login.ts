export type BuyerLoginValues = {
  email: string;
  password: string;
};

export type BuyerLoginErrors = Partial<Record<keyof BuyerLoginValues, string>>;

export function validateBuyerLogin(values: BuyerLoginValues): BuyerLoginErrors {
  const errors: BuyerLoginErrors = {};
  const email = values.email.trim();

  if (!email) {
    errors.email = "Email wajib diisi.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Format email belum benar. Contoh: nama@email.com";
  }

  // Login memeriksa keberadaan sandi, bukan aturan panjang untuk akun baru.
  if (!values.password) {
    errors.password = "Kata sandi wajib diisi.";
  }

  return errors;
}
