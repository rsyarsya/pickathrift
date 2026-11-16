import { ApiError } from "@/lib/api";

/** Belum ada layanan newsletter; jangan mengklaim email sudah didaftarkan. */
export function subscribeNewsletter(email: string): Promise<void> {
  void email;
  return Promise.reject(new ApiError(503, "Newsletter belum tersedia. Email belum didaftarkan."));
}
