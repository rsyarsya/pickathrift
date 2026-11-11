import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Samakan daftar ini dengan token --text-* di globals.css agar tailwind-merge
// mengenali kelas seperti text-display sebagai tipografi, terpisah dari warna teks.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "title", "price", "card", "body", "caption", "micro", "nano"],
    },
  },
});

/** Menggabungkan class dan membuat class Tailwind terakhir menang atas yang lebih awal. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
