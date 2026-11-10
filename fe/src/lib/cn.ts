import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Samakan daftar ini dengan token --text-* di globals.css agar tailwind-merge
// mengenali kelas seperti text-hero sebagai tipografi, terpisah dari warna teks.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["hero", "page", "section", "card", "price", "body", "strong", "helper", "overline"],
    },
  },
});

/** Menggabungkan class dan membuat class Tailwind terakhir menang atas yang lebih awal. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
