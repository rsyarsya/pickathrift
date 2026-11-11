import { ApiError } from "@/lib/api";

/*
 * SEMENTARA: belum ada endpoint newsletter. Begitu ada, ganti isinya dengan
 *   api("/newsletter", { method: "POST", body: JSON.stringify({ email }) })
 * Email berisi "gagal" memicu galat supaya state galat bisa dicoba.
 */
export function subscribeNewsletter(email: string): Promise<void> {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      if (email.includes("gagal")) reject(new ApiError(503, "Pendaftaran gagal. Coba lagi."));
      else resolve();
    }, 600),
  );
}
