import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  authState,
  login,
  loginWithGoogle,
  logout,
  register,
  restoreSession,
} from "./auth-service";
import { getToken, setToken } from "@/lib/auth-token";
const user = { id: "test-id", name: "Buyer Test", email: "buyer@example.test", role: "buyer" };
function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status });
}
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
      removeItem: (k: string) => values.delete(k),
    },
  });
  logout();
});
afterEach(() => {
  logout();
  vi.unstubAllGlobals();
});
describe("real authentication", () => {
  it("registers without creating a session", async () => {
    const fetcher = vi.fn().mockResolvedValue(response({ success: true, data: user }));
    vi.stubGlobal("fetch", fetcher);
    expect(
      await register({
        name: user.name,
        email: user.email,
        password: "Test12345!",
        confirmPassword: "Test12345!",
      }),
    ).toEqual(user);
    expect(fetcher.mock.calls[0]![0]).toMatch(/\/api\/auth\/register$/);
    expect(getToken()).toBeNull();
    expect(authState.get().user).toBeNull();
  });
  it("logs in, restores from backend with Bearer, and logs out", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response({ success: true, data: { token: "test-token", user } }))
      .mockResolvedValueOnce(response({ success: true, data: user }));
    vi.stubGlobal("fetch", fetcher);
    await login({ email: user.email, password: "Test12345!" }, "buyer");
    expect(getToken()).toBe("test-token");
    expect(authState.get().user).toEqual(user);
    expect(JSON.parse(fetcher.mock.calls[0]![1].body).role).toBe("buyer");
    authState.set({ user: null, lastActiveAt: 0 });
    await restoreSession();
    expect(fetcher.mock.calls[1]![1].headers.get("Authorization")).toBe("Bearer test-token");
    expect(fetcher.mock.calls[1]![1].credentials).toBe("omit");
    expect(authState.get().user).toEqual(user);
    logout();
    expect(getToken()).toBeNull();
    expect(authState.get().user).toBeNull();
  });
  it("clears an invalid or expired session on 401", async () => {
    setToken("expired");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ message: "Sesi berakhir" }, 401)));
    await restoreSession();
    expect(getToken()).toBeNull();
    expect(authState.get().user).toBeNull();
  });
  it("reports network failure without discarding the token", async () => {
    setToken("valid");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(restoreSession()).rejects.toMatchObject({ status: 0 });
    expect(getToken()).toBe("valid");
  });
  it.each([401, 403, 409])(
    "propagates auth errors (%s) without a false session",
    async (status) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ message: "Ditolak" }, status)));
      await expect(login({ email: user.email, password: "wrong" }, "admin")).rejects.toMatchObject({
        status,
      });
      expect(authState.get().user).toBeNull();
    },
  );
  it("ignores old local profile sessions when there is no token", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(user) });
    await restoreSession();
    expect(fetcher).not.toHaveBeenCalled();
    expect(authState.get().user).toBeNull();
  });
  it("does not restore a session after logout during an in-flight request", async () => {
    setToken("old");
    let finish!: (r: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      ),
    );
    const pending = restoreSession();
    logout();
    finish(response({ success: true, data: user }));
    await pending;
    expect(authState.get().user).toBeNull();
  });

  it("does not clear a newer login when an earlier request returns 401", async () => {
    setToken("old");
    let finish!: (r: Response) => void;
    const fetcher = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValueOnce(response({ success: true, data: { token: "new", user } }));
    vi.stubGlobal("fetch", fetcher);
    const pending = restoreSession();
    await login({ email: user.email, password: "Test12345!" }, "buyer");
    finish(response({ message: "Old session expired" }, 401));
    await pending;
    expect(getToken()).toBe("new");
    expect(authState.get().user).toEqual(user);
  });
});

describe("Google sign-in", () => {
  it("sends the Google credential and starts a buyer session", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(response({ success: true, data: { token: "google-token", user } }));
    vi.stubGlobal("fetch", fetcher);
    expect(await loginWithGoogle("google-id-token")).toEqual(user);
    expect(fetcher.mock.calls[0]![0]).toMatch(/\/api\/auth\/google$/);
    expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({ credential: "google-id-token" });
    expect(fetcher.mock.calls[0]![1].headers.get("Authorization")).toBeNull();
    expect(getToken()).toBe("google-token");
    expect(authState.get().user).toEqual(user);
  });
  it("keeps the user signed out when Google is rejected", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          response(
            { success: false, code: "GOOGLE_TOKEN_INVALID", message: "Gagal masuk dengan Google." },
            401,
          ),
        ),
    );
    await expect(loginWithGoogle("bad")).rejects.toMatchObject({ status: 401 });
    expect(getToken()).toBeNull();
    expect(authState.get().user).toBeNull();
  });
});
