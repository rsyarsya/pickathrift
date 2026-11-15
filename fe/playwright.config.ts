import { defineConfig } from "@playwright/test";

const apiUrl = "http://127.0.0.1:5107";
const baseURL = "http://127.0.0.1:3107";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./dist/playwright",
  timeout: 45_000,
  workers: 1,
  use: { baseURL, viewport: { width: 1440, height: 900 }, trace: "retain-on-failure" },
  globalSetup: "./e2e/setup.ts",
  webServer: {
    command: "pnpm build && pnpm exec next start --hostname 127.0.0.1 --port 3107",
    env: {
      NEXT_PUBLIC_API_URL: apiUrl,
      NEXT_PUBLIC_TRANSFER_BANK: "Bank Uji",
      NEXT_PUBLIC_TRANSFER_NUMBER: "0000000000",
      NEXT_PUBLIC_TRANSFER_HOLDER: "Toko Uji",
    },
    url: baseURL,
    timeout: 180_000,
  },
});
