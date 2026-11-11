import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockAuthService, MOCK_ACCOUNTS } from "./mock-auth";

const registration = {
  name: "Buyer Baru",
  email: "baru@example.com",
  password: "Baru123!",
  confirmPassword: "Baru123!",
};
afterEach(() => vi.unstubAllEnvs());

describe("simulasi auth", () => {
  it.each(MOCK_ACCOUNTS)("mengizinkan login $role dengan akun uji yang sesuai", async (account) => {
    const result = await createMockAuthService(0).login(account, account.role);
    expect(result).toMatchObject({ email: account.email, role: account.role });
    expect(result).not.toHaveProperty("password");
  });

  it("memberikan kegagalan yang sama untuk akun tidak ada dan sandi salah", async () => {
    const auth = createMockAuthService(0);
    for (const values of [
      { ...MOCK_ACCOUNTS[0], password: "salah123" },
      { email: "tidakada@example.com", password: "salah123" },
    ]) {
      await expect(auth.login(values, "buyer")).rejects.toMatchObject({
        status: 401,
        message: expect.stringContaining("Email atau kata sandi salah"),
      });
    }
  });

  it("menolak login lintas peran meskipun sandi benar", async () => {
    const auth = createMockAuthService(0);
    await expect(auth.login(MOCK_ACCOUNTS[0], "admin")).rejects.toMatchObject({ status: 403 });
    await expect(auth.login(MOCK_ACCOUNTS[1], "buyer")).rejects.toMatchObject({ status: 403 });
  });

  it("kegagalan login Admin tidak mengarahkan ke registrasi publik", async () => {
    await expect(
      createMockAuthService(0).login({ ...MOCK_ACCOUNTS[1], password: "salah123" }, "admin"),
    ).rejects.toMatchObject({ status: 401, message: expect.stringContaining("pemilik toko") });
  });

  it("akun baru langsung bisa login sebagai Buyer dan tidak bisa menjadi Admin", async () => {
    const auth = createMockAuthService(0);
    const injectedRole = { ...registration, role: "admin" };
    expect(await auth.register(injectedRole)).toMatchObject({ role: "buyer" });
    expect(await auth.login(registration, "buyer")).toMatchObject({ name: registration.name });
    await expect(auth.login(registration, "admin")).rejects.toMatchObject({ status: 403 });
  });

  it("mengenali email yang sama meskipun kapital atau spasi luar berbeda", async () => {
    const auth = createMockAuthService(0);
    await auth.register(registration);
    await expect(
      auth.register({ ...registration, email: " BARU@EXAMPLE.COM " }),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      await auth.login({ ...registration, email: " BARU@EXAMPLE.COM " }, "buyer"),
    ).toMatchObject({ email: registration.email });
  });

  it("tidak menambahkan akun jika pendaftaran tidak valid", async () => {
    const auth = createMockAuthService(0);
    await expect(
      auth.register({ ...registration, confirmPassword: "berbeda" }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(auth.login(registration, "buyer")).rejects.toMatchObject({ status: 401 });
  });

  it("sandi diperiksa persis dan objek hasil tidak bisa mengubah peran di penyimpanan", async () => {
    const auth = createMockAuthService(0);
    await expect(
      auth.login({ ...MOCK_ACCOUNTS[0], password: " Buyer123! " }, "buyer"),
    ).rejects.toMatchObject({ status: 401 });
    const user = await auth.login(MOCK_ACCOUNTS[0], "buyer");
    user.role = "admin";
    await expect(auth.login(MOCK_ACCOUNTS[0], "admin")).rejects.toMatchObject({ status: 403 });
  });

  it("penyimpanan baru memulihkan akun awal", async () => {
    await createMockAuthService(0).register(registration);
    await expect(createMockAuthService(0).login(registration, "buyer")).rejects.toMatchObject({
      status: 401,
    });
  });

  it("simulasi menolak semua operasi di production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const auth = createMockAuthService(0);
    await expect(auth.login(MOCK_ACCOUNTS[0], "buyer")).rejects.toThrow(
      "tidak tersedia di production",
    );
    await expect(auth.register(registration)).rejects.toThrow("tidak tersedia di production");
  });
});
