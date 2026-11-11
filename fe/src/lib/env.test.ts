import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("pengaktifan simulasi auth", () => {
  it.each([
    ["development", "on", true],
    ["development", "off", false],
    ["production", "on", false],
  ] as const)("NODE_ENV=%s dan flag=%s menghasilkan %s", async (mode, flag, expected) => {
    vi.stubEnv("NODE_ENV", mode);
    vi.stubEnv("NEXT_PUBLIC_AUTH_SIMULATION", flag);
    vi.resetModules();
    const { AUTH_SIMULATION_ENABLED } = await import("./env");
    expect(AUTH_SIMULATION_ENABLED).toBe(expected);
  });
});
