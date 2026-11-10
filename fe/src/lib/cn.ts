import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/*
 * tailwind-merge hanya tahu skala milik Tailwind sendiri. Tanpa daftar ini ia membaca
 * `text-label` dan `text-ds-muted` sebagai dua ukuran font lalu membuang yang pertama.
 * Setiap skala yang ditambahkan di globals.css harus disebut di sini juga.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "price", "title", "heading", "body", "label", "caption"],
      radius: ["small", "row", "card"],
      ease: ["base", "drawer"],
    },
  },
});

/** Menggabungkan class dan membuat class Tailwind terakhir menang atas yang lebih awal. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
