import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type FeatureSectionProps = {
  id: string;
  overline: string;
  title: string;
  description: string;
  cta: { label: string; href: string };
  image: { src: string; alt: string };
  /** Foto di kiri (default) atau kanan. */
  imageSide?: "left" | "right";
  tone?: "surface" | "canvas";
  /** Warna latar foto selama dimuat. */
  imageBg?: string;
};

/**
 * Section fitur di landing: foto + overline + judul + ajakan. Dipakai untuk
 * Cari yang Cocok dan Meja Perbandingan. Karya awal: Ola.
 */
export function FeatureSection({
  id,
  overline,
  title,
  description,
  cta,
  image,
  imageSide = "left",
  tone = "surface",
  imageBg = "bg-subtle",
}: FeatureSectionProps) {
  return (
    <section
      aria-labelledby={id}
      className={cn("w-full", tone === "surface" ? "bg-surface" : "bg-canvas")}
    >
      <div className="mx-auto grid max-w-1200 grid-cols-1 items-center gap-32 px-16 py-48 md:grid-cols-2 md:gap-48 md:px-24 lg:py-64">
        <div
          className={cn(
            "relative aspect-[4/3] w-full overflow-hidden rounded-lg",
            imageBg,
            imageSide === "right" && "md:order-last",
          )}
        >
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col items-start gap-16">
          <p className="font-mono text-xs tracking-label text-muted">{overline}</p>
          <h2 id={id} className="text-title">
            {title}
          </h2>
          <p className="max-w-440 text-body text-muted">{description}</p>
          <ButtonLink href={cta.href} variant="outline" size="md">
            {cta.label}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
