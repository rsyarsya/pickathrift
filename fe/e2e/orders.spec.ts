import { expect, test, type Browser, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

const password = "PickaUji2026!";
const buyer = "buyer@pickathrift.test";
const stockProduct = "Jaket Uji Stok";
const expiredProduct = "Jaket Uji Kedaluwarsa";
const paymentProof = {
  name: "bukti-uji.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFElEQVQYlWP4z8CABzGMSjNgCQMAt8pjnanKDKUAAAAASUVORK5CYII=",
    "base64",
  ),
};

async function login(page: Page, email: string, returnTo: string, admin = false) {
  const route = admin ? "/admin/masuk" : "/masuk";
  await page.goto(`${route}?kembali=${encodeURIComponent(returnTo)}`);
  await page.getByLabel(admin ? "Email admin" : "Email", { exact: true }).fill(email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: admin ? "Masuk ke dasbor" : "Masuk", exact: true })
    .click();
  await expect(page).toHaveURL((url) => url.pathname === returnTo);
}

async function openProduct(page: Page, name: string) {
  await page.goto("/katalog");
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}

async function openCheckout(page: Page, name: string) {
  await openProduct(page, name);
  await page.getByRole("button", { name: "Beli sekarang" }).click();
  await expect(page.getByRole("heading", { name: "Checkout", exact: true })).toBeVisible();
}

function placeOrder(page: Page) {
  return Promise.all([
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/orders" &&
        response.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Lanjut ke pembayaran", exact: true }).click(),
  ]).then(([response]) => response);
}

function openIsolatedPage(browser: Browser, baseURL: string | undefined) {
  return browser.newPage({ baseURL, viewport: { width: 1440, height: 900 } });
}

test("daftar hingga ulasan dengan Buyer dan Admin", async ({ page, browser, baseURL }) => {
  const email = `alur-${randomUUID()}@pickathrift.test`;
  const product = "Jaket Uji Alur Lengkap";
  await page.goto("/daftar");
  await page.getByLabel("Nama lengkap").fill("Pembeli Alur Uji");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page.getByLabel("Ulangi kata sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Buat akun" }).click();
  await expect(page.getByRole("heading", { name: /Akun dibuat/ })).toBeVisible();

  await login(page, email, "/profil");
  await page.getByLabel("Nama penerima").fill("Penerima Uji");
  await page.getByLabel("Nomor HP penerima").fill("081234567890");
  await page.getByLabel("Alamat lengkap").fill("Jl. Uji 7");
  await page.getByLabel("Kota", { exact: true }).fill("Yogyakarta");
  await page.getByLabel("Kode pos").fill("55281");
  await page.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(page.getByText("✓ Perubahan disimpan")).toBeVisible();

  await openCheckout(page, product);
  await expect(page.getByLabel("Nama penerima")).toHaveValue("Penerima Uji");
  const placed = await placeOrder(page);
  expect(placed.status()).toBe(201);
  const { data: order } = await placed.json();
  await expect(page.getByRole("heading", { name: "Selesaikan pembayaran" })).toBeVisible();
  await page.locator("#payment-proof").setInputFiles(paymentProof);
  await page.getByRole("button", { name: "Kirim bukti pembayaran" }).click();
  await expect(page.getByRole("heading", { name: "Bukti diterima" })).toBeVisible();

  const admin = await openIsolatedPage(browser, baseURL);
  try {
    await login(admin, "admin@pickathrift.test", "/admin/pesanan", true);
    await admin
      .getByRole("row", { name: new RegExp(product) })
      .getByRole("link", { name: "Verifikasi" })
      .click();
    await admin.getByRole("button", { name: "Lihat", exact: true }).click();
    const proof = admin
      .getByRole("dialog")
      .getByRole("img", { name: "Bukti pembayaran yang diunggah" });
    await expect(proof).toHaveAttribute("src", /^blob:/);
    await expect
      .poll(() => proof.evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBeGreaterThan(0);
    await admin.getByRole("button", { name: "Tutup" }).click();
    await admin.getByRole("checkbox", { name: /Nominal sama/ }).check();
    await admin.getByRole("checkbox", { name: /Rekening tujuan/ }).check();
    await admin.getByRole("checkbox", { name: /Waktu transfer/ }).check();
    await admin.getByRole("button", { name: "Setujui pembayaran" }).click();
    await admin.getByLabel("Nomor resi").fill("RESI-UJI-2026");
    await admin.getByRole("button", { name: "Simpan dan tandai Dikirim" }).click();
    await expect(admin.getByText("Resi tersimpan. Status pesanan sekarang Dikirim.")).toBeVisible();
  } finally {
    await admin.close();
  }

  await page.goto(`/pesanan/${order.id}`);
  await expect(page.getByText("RESI-UJI-2026")).toBeVisible();
  await page.getByRole("button", { name: "Konfirmasi pesanan diterima" }).click();
  await page.getByRole("link", { name: /Tulis ulasan/ }).click();
  await page.getByRole("radio", { name: "5 bintang" }).press("Space");
  const review = "Jaket sesuai foto dan diterima dalam kondisi baik.";
  await page.getByLabel("Ceritakan pengalamanmu").fill(review);
  await page.getByRole("button", { name: "Kirim ulasan" }).click();
  await expect(page.getByRole("heading", { name: "Ulasan terkirim" })).toBeVisible();
  await page.getByRole("link", { name: "Lihat ulasan toko" }).click();
  await expect(page.getByText(review)).toBeVisible();
});

test("dua sesi berebut satu barang, lalu stok kembali setelah pembatalan", async ({
  page,
  browser,
  baseURL,
}) => {
  const other = await openIsolatedPage(browser, baseURL);
  try {
    await Promise.all([login(page, buyer, "/"), login(other, "other@pickathrift.test", "/")]);
    await Promise.all([openCheckout(page, stockProduct), openCheckout(other, stockProduct)]);
    const attempts = await Promise.all([placeOrder(page), placeOrder(other)]);
    expect(attempts.map((attempt) => attempt.status()).sort()).toEqual([201, 409]);
    const winner = attempts[0]!.status() === 201 ? page : other;
    const loser = winner === page ? other : page;
    const conflict = attempts.find((response) => response.status() === 409)!;
    expect(await conflict.json()).toMatchObject({ code: "STOCK_CONFLICT" });
    await expect(loser.getByRole("dialog", { name: /Yah, keduluan/ })).toBeVisible();

    await winner.getByRole("button", { name: "Batalkan pesanan" }).click();
    await winner.getByRole("dialog").getByRole("button", { name: "Ya, batalkan" }).click();
    await expect(winner.getByRole("heading", { name: "Pesanan dibatalkan" })).toBeVisible();
    await openProduct(loser, stockProduct);
    await expect(loser.getByRole("button", { name: "Beli sekarang" })).toBeEnabled();
  } finally {
    await other.close();
  }
});

test("pesanan kedaluwarsa melepas stok dan katalog pulih setelah offline", async ({
  page,
  context,
}) => {
  await login(page, buyer, "/pesanan/507f1f77bcf86cd799439014");
  await expect(
    page.getByText("Pesanan dibatalkan karena batas waktu pembayaran habis."),
  ).toBeVisible();
  await openProduct(page, expiredProduct);
  await expect(page.getByRole("button", { name: "Beli sekarang" })).toBeEnabled();
  await page.goto("/katalog");
  await expect(page.getByRole("link", { name: expiredProduct, exact: true })).toBeVisible();
  await context.setOffline(true);
  await expect(page.getByRole("heading", { name: "Tidak ada koneksi internet" })).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByRole("link", { name: expiredProduct, exact: true })).toBeVisible();
});
