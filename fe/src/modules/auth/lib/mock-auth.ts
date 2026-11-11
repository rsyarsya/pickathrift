import { validateBuyerLogin, type BuyerLoginValues } from "./validate-buyer-login";
import { validateRegistration, type RegistrationValues } from "./validate-registration";

export type MockRole = "buyer" | "admin";
export type MockUser = { name: string; email: string; role: MockRole };

// Kredensial fiktif untuk QA. Bukan akun, token, atau rahasia backend.
export const MOCK_ACCOUNTS = [
  { name: "Buyer Uji", email: "buyer@pickathrift.test", password: "Buyer123!", role: "buyer" },
  { name: "Admin Uji", email: "admin@pickathrift.test", password: "Admin123!", role: "admin" },
] as const;

export class MockAuthError extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 409,
    message: string,
  ) {
    super(message);
    this.name = "MockAuthError";
  }
}

export function createMockAuthService(latencyMs = 650) {
  const users: (MockUser & { password: string })[] = MOCK_ACCOUNTS.map((user) => ({ ...user }));
  const normalizeEmail = (email: string) => email.trim().toLowerCase();
  const publicUser = ({ name, email, role }: MockUser): MockUser => ({ name, email, role });

  async function simulateDelay() {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Simulasi auth tidak tersedia di production.");
    }
    if (latencyMs > 0) await new Promise<void>((resolve) => setTimeout(resolve, latencyMs));
  }

  return {
    async login(values: BuyerLoginValues, role: MockRole): Promise<MockUser> {
      await simulateDelay();
      if (Object.keys(validateBuyerLogin(values)).length) {
        throw new MockAuthError(400, "Periksa kembali email dan kata sandi.");
      }
      const user = users.find((item) => item.email === normalizeEmail(values.email));
      if (!user || user.password !== values.password) {
        throw new MockAuthError(
          401,
          role === "admin"
            ? "Email atau kata sandi salah. Periksa akun admin yang diberikan pemilik toko."
            : "Email atau kata sandi salah. Periksa lagi, atau daftar kalau belum punya akun.",
        );
      }
      if (user.role !== role) {
        throw new MockAuthError(
          403,
          role === "admin"
            ? "Akun ini bukan Admin. Masuk lewat halaman Buyer."
            : "Akun ini adalah Admin. Masuk lewat halaman admin.",
        );
      }
      return publicUser(user);
    },

    async register(values: RegistrationValues): Promise<MockUser> {
      await simulateDelay();
      if (Object.keys(validateRegistration(values)).length) {
        throw new MockAuthError(400, "Periksa kembali isian pendaftaran.");
      }
      const email = normalizeEmail(values.email);
      if (users.some((item) => item.email === email)) {
        throw new MockAuthError(
          409,
          "Email ini sudah terdaftar. Gunakan email lain atau masuk ke akunmu.",
        );
      }
      const user = {
        name: values.name.trim(),
        email,
        password: values.password,
        role: "buyer" as const,
      };
      users.push(user);
      return publicUser(user);
    },
  };
}

// Satu penyimpanan selama navigasi di tab ini. Refresh memulihkan akun uji awal.
export const mockAuth = createMockAuthService();
