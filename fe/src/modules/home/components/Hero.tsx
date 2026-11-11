import Image from "next/image";
import { Logo } from "@/components/layout/Logo";
import { ButtonLink } from "@/components/ui/Button";

/** Pembuka landing: foto besar, logo raksasa, ajakan ke katalog. Karya awal: Ola. */
export function Hero() {
  return (
    <section className="w-full">
      <div className="relative h-260 w-full overflow-hidden bg-subtle sm:h-360 lg:h-440">
        <Image
          src="/images/hero-foto.png"
          alt="Dua model mengenakan pakaian thrift PickaThrift"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      <div className="px-16 pt-32 pb-48 md:px-24 lg:px-48 lg:pt-48 lg:pb-64">
        <h1>
          <Logo size="clamp(48px, 8vw, 96px)" />
        </h1>

        <div className="mt-24 flex flex-col gap-24 border-t border-line pt-20 md:flex-row md:items-end md:justify-between">
          <div className="max-w-560">
            <p className="font-mono text-xs tracking-label text-muted">
              PILIHAN LAMA. CERITA BARU.
            </p>
            <p className="mt-12 text-body text-muted">
              Thrift pilihan dari satu toko. Setiap barang hanya tersedia satu unit. Temukan pakaian
              yang cocok dengan gaya dan ceritamu.
            </p>
          </div>

          <ButtonLink href="/katalog" size="md" className="self-start md:self-auto">
            Jelajahi katalog →
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
