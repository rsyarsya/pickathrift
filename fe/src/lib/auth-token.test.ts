import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getToken, setToken } from "./auth-token";

let values: Map<string, string>;
beforeEach(() => {
  values = new Map();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
  setToken(null);
});
afterEach(() => {
  setToken(null);
  vi.unstubAllGlobals();
});

describe("token storage", () => {
  it("does not resurrect a token after sessionStorage is cleared", () => {
    setToken("temporary-token");
    expect(getToken()).toBe("temporary-token");
    values.clear();
    expect(getToken()).toBeNull();
  });

  it("keeps a usable memory session when writes are blocked but reads work", () => {
    window.sessionStorage.setItem = () => {
      throw new Error("Storage blocked");
    };
    setToken("memory-token");
    expect(getToken()).toBe("memory-token");
    setToken(null);
    expect(getToken()).toBeNull();
  });

  it("does not expose a browser token during server rendering", () => {
    setToken("browser-token");
    vi.stubGlobal("window", undefined);
    expect(getToken()).toBeNull();
  });
});
