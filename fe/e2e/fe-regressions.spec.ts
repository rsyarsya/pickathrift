import { test, expect, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const api = "http://127.0.0.1:5107/api";
const password = "PickaUji2026!";
const proof = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFElEQVQYlWP4z8CABzGMSjNgCQMAt8pjnanKDKUAAAAASUVORK5CYII=",
  "base64",
);

test("design remains unchanged at three viewport widths", async ({ page }) => {
  const folder = resolve("../output/playwright/fe-regressions");
  mkdirSync(folder, { recursive: true });
  const stage = existsSync(resolve(folder, "before-masuk-390.png")) ? "after" : "before";
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["masuk", "katalog"]) {
      await page.goto(`/${route}`);
      await page.getByRole("heading", { level: 1 }).waitFor();
      if (route === "katalog") await page.getByRole("article").first().waitFor();
      await page.waitForLoadState("networkidle");
      await page.screenshot({
        path: resolve(folder, `${stage}-${route}-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
    }
  }
});

test("newsletter reports unavailable without claiming registration", async ({ page }) => {
  await page.goto("/katalog");
  await page.getByRole("article").first().waitFor();
  await page.waitForLoadState("networkidle");
  const email = page.getByRole("textbox", {
    name: "Kabari aku kalau ada barang baru",
    exact: true,
  });
  const submit = page.getByRole("button", { name: "Daftar", exact: true });
  await email.fill("invalid");
  await submit.click();
  await expect(
    page.getByText("Format email belum benar. Contoh: nama@email.com", { exact: true }),
  ).toBeVisible();
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/")) requests.push(request.url());
  });
  await email.fill("qa@example.test");
  await submit.click();
  await expect(
    page.getByText("Newsletter belum tersedia. Email belum didaftarkan.", { exact: true }),
  ).toBeVisible();
  await expect(submit).toBeEnabled();
  await expect(page.getByText("✓ Terdaftar", { exact: true })).toHaveCount(0);
  expect(requests).toEqual([]);
});

async function token(page: Page, email: string, role: string) {
  const response = await page.request.post(`${api}/auth/login`, {
    data: { email, password, role },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).data.token as string;
}

test("admin reason dialogs keep independent radios, labels and submitted notes", async ({
  page,
}) => {
  const admin = await token(page, "admin@pickathrift.test", "admin");
  const buyer = await token(page, "buyer@pickathrift.test", "buyer");
  const product = await page.request.post(`${api}/products`, {
    headers: { Authorization: `Bearer ${admin}` },
    data: {
      name: "Jaket Regresi Dialog",
      brand: "Vintage",
      category: "Jaket",
      size: "M",
      condition: "Baik",
      style: "Kasual",
      color: "Olive",
      price: 75000,
      images: ["/uploads/products/uji.jpg"],
      measurements: [],
    },
  });
  expect(product.status()).toBe(201);
  const created = await page.request.post(`${api}/orders`, {
    headers: { Authorization: `Bearer ${buyer}` },
    data: { product_id: (await product.json()).data.id },
  });
  expect(created.status()).toBe(201);
  const id = (await created.json()).data.id as string;
  const uploaded = await page.request.post(`${api}/orders/${id}/payment-proof`, {
    headers: { Authorization: `Bearer ${buyer}` },
    multipart: { file: { name: "proof.png", mimeType: "image/png", buffer: proof } },
  });
  expect(uploaded.ok()).toBeTruthy();
  await page.goto(`/admin/masuk?kembali=${encodeURIComponent(`/admin/pesanan/${id}`)}`);
  await page.getByLabel("Email admin", { exact: true }).fill("admin@pickathrift.test");
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk ke dasbor", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/pesanan/${id}$`));
  await page.getByRole("button", { name: "Tolak dan batalkan", exact: true }).click();
  const reject = page.getByRole("dialog", { name: /Batalkan pesanan/ });
  const second = reject.getByRole("radio", { name: "Tidak ada dana masuk", exact: true });
  await second.check();
  await expect(second).toBeChecked();
  await second.press("ArrowDown");
  await expect(reject.getByRole("radio", { name: "Alasan lain", exact: true })).toBeChecked();
  await reject.getByRole("button", { name: "Batalkan pesanan", exact: true }).click();
  await expect(
    reject.getByText("Tulis alasannya, minimal 5 karakter.", { exact: true }),
  ).toBeVisible();
  await reject.getByRole("textbox", { name: "Alasan lain", exact: true }).fill("abc");
  await reject.getByRole("button", { name: "Batalkan pesanan", exact: true }).click();
  await expect(reject.getByRole("textbox", { name: "Alasan lain", exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await reject.press("Escape");
  await expect(reject).not.toBeVisible();
  await page.getByRole("button", { name: "Tolak dan batalkan", exact: true }).click();
  await expect(
    reject.getByRole("radio", { name: "Nominal tidak sesuai total", exact: true }),
  ).toBeChecked();
  await reject.getByRole("button", { name: "Kembali", exact: true }).click();
  await page.getByRole("button", { name: "Minta unggah ulang", exact: true }).click();
  const reupload = page.getByRole("dialog", { name: "Minta buyer unggah ulang?", exact: true });
  const reuploadSecond = reupload.getByRole("radio", {
    name: "Nominal atau rekening tidak terlihat",
    exact: true,
  });
  await reuploadSecond.check();
  await expect(reuploadSecond).toBeChecked();
  await reuploadSecond.press("ArrowDown");
  await expect(reupload.getByRole("radio", { name: "Alasan lain", exact: true })).toBeChecked();
  await reupload.getByRole("button", { name: "Kirim permintaan", exact: true }).click();
  await expect(
    reupload.getByText("Tulis alasannya, minimal 5 karakter.", { exact: true }),
  ).toBeVisible();
  await reupload
    .getByRole("textbox", { name: "Alasan lain", exact: true })
    .fill("QA bukti harus jelas");
  const [resubmit] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/actions")),
    reupload.getByRole("button", { name: "Kirim permintaan", exact: true }).click(),
  ]);
  expect((await resubmit.json()).data).toMatchObject({
    status: "PERLU_UNGGAH_ULANG",
    adminNote: "QA bukti harus jelas",
  });
  await page.getByRole("button", { name: "Tolak dan batalkan", exact: true }).click();
  await reject.getByRole("radio", { name: "Tidak ada dana masuk", exact: true }).check();
  const [cancelled] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/actions")),
    reject.getByRole("button", { name: "Batalkan pesanan", exact: true }).click(),
  ]);
  expect((await cancelled.json()).data).toMatchObject({
    status: "DIBATALKAN",
    adminNote: "Tidak ada dana masuk",
  });
});
