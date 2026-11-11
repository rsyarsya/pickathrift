import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const FEATURES = [
  {
    number: "01",
    title: "Cari yang Cocok",
    description:
      "Ukuran label bisa beda antarmerek. Isi ukuran pakaian favoritmu dalam sentimeter, kami carikan yang selisihnya paling kecil.",
    cta: { label: "Coba Cari yang Cocok →", href: "/cari-yang-cocok" },
    image: {
      src: "/guides/cara-mengukur.jpg",
      alt: "Kaos putih terbentang dengan meteran di garis dada",
    },
  },
  {
    number: "02",
    title: "Meja Perbandingan",
    description:
      "Dua barang mirip, satu keputusan. Lihat harga, ukuran, kondisi, dan statusnya berdampingan tanpa pindah halaman.",
    cta: { label: "Buka Meja Perbandingan →", href: "/meja-perbandingan" },
    image: {
      src: "/images/fitur-meja-perbandingan.jpg",
      alt: "Jaket denim dan jaket hijau zaitun berdampingan",
    },
  },
];

/** Dua fitur unggulan: foto dan teks bergantian kiri-kanan di desktop. */
export function Features() {
  return (
    <section
      aria-label="Fitur unggulan"
      className="flex flex-col gap-48 px-16 py-64 md:px-24 lg:gap-24 lg:px-48 lg:py-96"
    >
      {FEATURES.map((feature, i) => {
        const flipped = i % 2 === 1;
        return (
          <article key={feature.number} className="grid items-center gap-24 lg:grid-cols-2">
            <div
              className={cn(
                "relative aspect-[4/3] overflow-hidden rounded-sm bg-subtle lg:aspect-auto lg:h-520",
                flipped && "lg:order-last",
              )}
            >
              <Image
                src={feature.image.src}
                alt={feature.image.alt}
                fill
                sizes="(min-width: 1024px) 46vw, 100vw"
                className="object-cover"
              />
            </div>
            <div
              className={cn("flex flex-col gap-16 lg:gap-20", flipped ? "lg:pr-56" : "lg:pl-56")}
            >
              <p className="font-mono text-xs tracking-label text-muted">
                FITUR UNGGULAN · {feature.number}
              </p>
              <h2 className="text-[36px] leading-none font-medium tracking-[-0.04em] md:text-[48px] lg:text-[64px]">
                {feature.title}
              </h2>
              <p className="text-base leading-normal md:text-lg">{feature.description}</p>
              <ButtonLink
                href={feature.cta.href}
                variant="outline"
                className="px-26 max-md:w-full md:self-start"
              >
                {feature.cta.label}
              </ButtonLink>
            </div>
          </article>
        );
      })}
    </section>
  );
}
