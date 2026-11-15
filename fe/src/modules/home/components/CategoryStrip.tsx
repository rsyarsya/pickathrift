import Image from "next/image";
import Link from "next/link";
import { CATEGORIES } from "@/modules/catalog/types";

/** Foto per kategori. Latar fotonya mengikuti warna kategori: peach, lilac, butter, mint. */
const PHOTOS = {
  Jaket: { src: "/images/kategori-jaket.jpg", alt: "Jaket kanvas cokelat dengan kerah korduroi" },
  Kaos: {
    src: "/images/kategori-kaos.jpg",
    alt: "Tumpukan kaos band bekas di atas alas tanah liat",
  },
  Kemeja: { src: "/images/kategori-kemeja.jpg", alt: "Kerah kemeja katun biru muda" },
  Celana: {
    src: "/images/kategori-celana.jpg",
    alt: "Tumpukan celana jeans dan chino yang dilipat",
  },
} as const;

/** Empat kategori sekali saja, sebagai kartu foto berlabel: 2×2 di ponsel, satu baris di desktop. */
export function CategoryStrip() {
  return (
    <nav
      aria-labelledby="category-title"
      // Tanpa padding atas/bawah: jaraknya sudah dari section sebelum dan sesudahnya.
      className="flex flex-col gap-16 px-16 md:px-24 lg:gap-20 lg:px-48"
    >
      <div className="flex items-baseline justify-between gap-16">
        <h2 id="category-title" className="text-body font-medium">
          Belanja per kategori
        </h2>
        <Link href="/katalog" className="text-sm underline underline-offset-2 hover:text-brand">
          Lihat semua
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-8 md:gap-12 lg:grid-cols-4 lg:gap-16">
        {CATEGORIES.map((category) => (
          <li key={category}>
            <Link
              href={`/katalog?kategori=${category}`}
              className="group relative block aspect-[3/4] overflow-hidden bg-subtle"
            >
              <Image
                src={PHOTOS[category].src}
                alt={PHOTOS[category].alt}
                fill
                sizes="(min-width: 1024px) 23vw, 46vw"
                className="photo-zoom object-cover"
              />
              <span className="absolute inset-x-8 bottom-8 bg-surface py-10 text-center text-sm font-medium transition-colors duration-200 group-hover:bg-fg group-hover:text-canvas md:inset-x-16 md:bottom-16 md:py-14 md:text-base">
                {category}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
