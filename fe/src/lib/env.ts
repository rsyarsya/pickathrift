// Hanya nilai publik. Jangan pernah menaruh rahasia di variabel NEXT_PUBLIC_*.

/** Lokasi API backend, misalnya http://localhost:4000 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Galeri komponen di /dev/gallery hanya terbuka kalau nilainya "on". */
export const GALLERY_OPEN = process.env.NEXT_PUBLIC_GALLERY === "on";

/** Simulasi auth hanya boleh berjalan di development lokal. */
export const AUTH_SIMULATION_ENABLED =
  process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_AUTH_SIMULATION === "on";
