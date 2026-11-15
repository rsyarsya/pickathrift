import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_URL } from "@/lib/env";
import { setToken } from "@/lib/auth-token";
import { authState, logout } from "@/modules/auth/lib/auth-service";
import { PRODUCTS } from "@/test/products";
import { loadCheckout } from "@/modules/checkout/data/checkout";
import {
  getProfile,
  getShippingAddress,
  profileToValues,
  saveProfile,
  type Profile,
} from "./profile";

const profile: Profile = {
  id: "buyer-1",
  name: "Buyer Uji",
  email: "buyer.uji@pickathrift.test",
  role: "buyer",
  phone: "081234567890",
  address: {
    recipient: "Penerima Uji",
    phone: "089876543210",
    street: "Jl. Uji",
    city: "Kota Uji",
    postalCode: "12345",
  },
};

function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: status < 400, data }), { status });
}

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
  vi.stubGlobal("localStorage", { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() });
  logout();
  setToken("buyer-token");
  authState.set({
    user: { id: profile.id, name: profile.name, email: profile.email, role: "buyer" },
    lastActiveAt: 123,
  });
});
afterEach(() => {
  logout();
  vi.unstubAllGlobals();
});

describe("profil dan alamat API", () => {
  it("memuat profil dengan Bearer dan membersihkan penyimpanan lama tanpa membacanya", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => reply(profile));
    vi.stubGlobal("fetch", fetcher);
    await expect(getProfile()).resolves.toEqual(profile);
    const request = new Request(...fetcher.mock.calls[0]!);
    expect(request.url).toBe(`${API_URL}/api/users/me`);
    expect(request.headers.get("Authorization")).toBe("Bearer buyer-token");
    expect(localStorage.removeItem).toHaveBeenCalledWith(`pickathrift.profile.${profile.email}`);
    expect(localStorage.removeItem).toHaveBeenCalledWith("pickathrift.addresses");
    expect(localStorage.getItem).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it("alamat null tetap null untuk checkout dan form memisahkan nama akun dari penerima", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => reply({ ...profile, address: null })),
    );
    await expect(getShippingAddress()).resolves.toBeNull();
    expect(profileToValues({ ...profile, address: null })).toEqual({
      name: profile.name,
      accountPhone: profile.phone,
      recipient: "",
      phone: "",
      street: "",
      city: "",
      postalCode: "",
    });
  });

  it("PATCH hanya mengirim nama, nomor akun, dan objek alamat lengkap; sesi memakai nama respons", async () => {
    const saved = { ...profile, name: "Nama dari server" };
    const fetcher = vi.fn<typeof fetch>(async () => reply(saved));
    vi.stubGlobal("fetch", fetcher);
    await expect(
      saveProfile({
        ...profileToValues(profile),
        name: " Nama di form ",
        accountPhone: "0812 3456 7890",
        recipient: " Penerima Uji ",
        phone: "0898 (7654) 3210",
        street: " Jl. Uji ",
      }),
    ).resolves.toEqual(saved);
    const request = new Request(...fetcher.mock.calls[0]!);
    expect(request.method).toBe("PATCH");
    expect(await request.json()).toEqual({
      name: "Nama di form",
      phone: "081234567890",
      address: profile.address,
    });
    expect(authState.get()).toMatchObject({
      lastActiveAt: 123,
      user: { name: saved.name, id: profile.id },
    });
    expect(authState.get().user?.name).not.toBe(profile.address!.recipient);
  });

  it("perubahan akun tanpa alamat tidak mengirim objek kosong atau null", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => reply({ ...profile, address: null }));
    vi.stubGlobal("fetch", fetcher);
    await saveProfile(profileToValues({ ...profile, address: null }));
    const request = new Request(...fetcher.mock.calls[0]!);
    expect(await request.json()).toEqual({ name: profile.name, phone: profile.phone });
  });

  it("menolak alamat parsial sebelum mengirim PATCH", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(
      saveProfile({ ...profileToValues({ ...profile, address: null }), city: "Kota Uji" }),
    ).rejects.toMatchObject({ status: 422 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([422, 503])("gagal menyimpan (%i) tidak mengubah nama sesi", async (status) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              code: "VALIDATION_ERROR",
              message: "Gagal menyimpan.",
              errors: { "address.city": "Tidak valid." },
            }),
            { status },
          ),
      ),
    );
    await expect(
      saveProfile({ ...profileToValues(profile), name: "Nama baru" }),
    ).rejects.toMatchObject({ status, errors: { "address.city": "Tidak valid." } });
    expect(authState.get().user?.name).toBe(profile.name);
  });

  it("jaringan putus ditampilkan sebagai galat dan penyimpanan lokal diblokir tidak menghalangi API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("offline");
      }),
    );
    await expect(getProfile()).rejects.toMatchObject({ status: 0 });
    vi.stubGlobal("localStorage", {
      removeItem: () => {
        throw new Error("blocked");
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => reply(profile)),
    );
    await expect(saveProfile(profileToValues(profile))).resolves.toEqual(profile);
  });

  it("respons simpan akun lama ditolak setelah pergantian akun", async () => {
    let resolve!: (response: Response) => void;
    const response = new Promise<Response>((done) => {
      resolve = done;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(() => response),
    );
    const saving = saveProfile({ ...profileToValues(profile), name: "Nama lama" });
    const rejected = expect(saving).rejects.toMatchObject({ status: 401 });
    setToken("buyer-2-token");
    authState.set({
      user: {
        id: "buyer-2",
        name: "Buyer Kedua",
        email: "buyer.kedua@pickathrift.test",
        role: "buyer",
      },
      lastActiveAt: 456,
    });
    resolve(reply({ ...profile, name: "Nama lama" }));
    await rejected;
    expect(authState.get().user?.name).toBe("Buyer Kedua");
  });

  it("checkout memakai alamat API yang sama dengan profil", async () => {
    const fetcher = vi.fn<typeof fetch>(async (url) =>
      reply(
        String(url).endsWith("/api/users/me")
          ? profile
          : String(url).endsWith("/api/orders/my")
            ? []
            : PRODUCTS[0],
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    const checkout = await loadCheckout(PRODUCTS[0]!.id, profile.email);
    expect(checkout.address).toEqual(profile.address);
    expect(checkout.fromProfile).toBe(true);
    expect(fetcher.mock.calls.some(([url]) => String(url).endsWith("/api/users/me"))).toBe(true);
  });
});
