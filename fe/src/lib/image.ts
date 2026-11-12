export const IMAGE_TYPES = ["image/jpeg", "image/png"];
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/** null kalau berkas boleh dipakai, atau pesan galat yang bisa langsung ditampilkan. */
export function imageError(file: Pick<File, "type" | "size">): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return "Pakai foto JPG atau PNG.";
  if (file.size === 0 || file.size > IMAGE_MAX_BYTES) return "Ukuran foto maksimal 2 MB.";
  return null;
}

/**
 * Mengecilkan foto ke sisi terpanjang `maxSide` lalu mengembalikannya sebagai data URL JPEG.
 * ponytail: dipakai karena foto produk sementara disimpan di localStorage (kuota ±5 MB);
 * hapus begitu foto diunggah ke backend lewat FormData.
 */
export async function toDataUrl(file: File, maxSide = 900): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.8);
}
