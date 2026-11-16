import { afterEach, describe, expect, it, vi } from "vitest";
import { closeReminder, reminderClosed, shouldRemindAddress } from "./address-reminder";

afterEach(() => vi.unstubAllGlobals());

describe("pengingat alamat", () => {
  it("hanya tampil kalau alamat pasti kosong dan bukan di halaman profil", () => {
    const empty = { id: "u1", address: null };
    expect(shouldRemindAddress(empty, "/")).toBe(true);
    expect(shouldRemindAddress(empty, "/katalog")).toBe(true);
    expect(shouldRemindAddress(empty, "/profil")).toBe(false);
    expect(shouldRemindAddress({ id: "u1", address: { city: "Yogyakarta" } }, "/")).toBe(false);
    expect(shouldRemindAddress({ id: "u1" }, "/")).toBe(false);
    expect(shouldRemindAddress(null, "/")).toBe(false);
  });

  it("menutup pengingat per akun dan aman saat penyimpanan diblokir", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    expect(reminderClosed("u1")).toBe(false);
    closeReminder("u1");
    expect(reminderClosed("u1")).toBe(true);
    expect(reminderClosed("u2")).toBe(false);

    const blocked = () => {
      throw new Error("blocked");
    };
    vi.stubGlobal("localStorage", { getItem: blocked, setItem: blocked });
    expect(() => closeReminder("u3")).not.toThrow();
    expect(reminderClosed("u3")).toBe(false);
  });
});
