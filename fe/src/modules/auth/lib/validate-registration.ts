import { validateBuyerLogin, type BuyerLoginValues } from "./validate-buyer-login";

export type RegistrationValues = BuyerLoginValues & {
  name: string;
  confirmPassword: string;
};

export function validateRegistration(values: RegistrationValues) {
  const errors: Partial<Record<keyof RegistrationValues, string>> = validateBuyerLogin(values);

  if (!values.name.trim()) errors.name = "Nama lengkap wajib diisi.";
  if (values.password && values.password.length < 8) {
    errors.password = "Kata sandi minimal 8 karakter.";
  }
  if (!values.confirmPassword) {
    errors.confirmPassword = "Ulangi kata sandi terlebih dahulu.";
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Kata sandi belum sama. Coba ketik ulang.";
  }

  return errors;
}
