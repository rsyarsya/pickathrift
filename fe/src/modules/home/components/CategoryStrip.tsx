import Link from "next/link";
import { Fragment } from "react";
import { CATEGORIES } from "@/modules/catalog/types";

const DOTS = ["bg-peach", "bg-lilac", "bg-butter", "bg-mint"];

/** Pita gelap berisi nama kategori besar. Isinya sengaja meluber ke kanan seperti di Figma. */
export function CategoryStrip() {
  return (
    <nav
      aria-label="Kategori"
      className="flex items-center gap-20 overflow-hidden bg-night py-20 pl-16 whitespace-nowrap text-night-fg md:gap-40 md:py-36 md:pl-24 lg:pl-48"
    >
      {/* Daftar kedua hanya hiasan supaya pita terlihat penuh. */}
      {[false, true].map((decorative) => (
        <Fragment key={String(decorative)}>
          {CATEGORIES.map((category, i) => (
            <Fragment key={category}>
              <Link
                href={`/katalog?kategori=${category}`}
                aria-hidden={decorative || undefined}
                tabIndex={decorative ? -1 : undefined}
                className="text-[44px] leading-none font-medium tracking-[-0.034em] hover:underline md:text-[88px]"
              >
                {category}
              </Link>
              <span
                aria-hidden
                className={`size-12 shrink-0 rounded-full md:size-22 ${DOTS[i % DOTS.length]}`}
              />
            </Fragment>
          ))}
        </Fragment>
      ))}
    </nav>
  );
}
