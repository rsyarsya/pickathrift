import { describe, expect, it } from "vitest";
import { PRODUCTS } from "@/modules/catalog/data/fixtures";
import { formFromProduct, validateProductForm } from "@/modules/admin/productForm";

describe("form produk admin", () => {
  it("menolak form kosong dengan pesan per kolom", () => {
    const result = validateProductForm(formFromProduct());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.images).toBe("Tambahkan minimal satu foto utama.");
      expect(result.errors.name).toBe("Nama barang wajib diisi.");
      expect(result.errors.price).toBe("Harga jual wajib diisi.");
    }
  });

  it("menolak harga di bawah Rp 1.000 dan ukuran yang bukan angka", () => {
    const form = { ...formFromProduct(PRODUCTS[0]), price: "Rp 0" };
    form.measurements = { ...form.measurements, Bahu: "lima" };
    const result = validateProductForm(form);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.price).toBe("Harga minimal Rp 1.000.");
      expect(result.errors["ukuran:Bahu"]).toBeDefined();
    }
  });

  it("produk yang ada lolos tanpa berubah", () => {
    const product = PRODUCTS[0]!;
    const result = validateProductForm(formFromProduct(product));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.price).toBe(product.price);
      expect(result.value.measurements).toEqual(product.measurements);
    }
  });
});
