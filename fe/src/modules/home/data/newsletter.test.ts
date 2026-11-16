import { afterEach, expect, it, vi } from "vitest";
import { subscribeNewsletter } from "./newsletter";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("reports unavailable immediately without registering, fetching or scheduling success", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  await expect(subscribeNewsletter("valid@example.test")).rejects.toMatchObject({
    status: 503,
    message: "Newsletter belum tersedia. Email belum didaftarkan.",
  });
  expect(fetcher).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});
