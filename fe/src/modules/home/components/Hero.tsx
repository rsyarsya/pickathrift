import Image from "next/image";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Pembuka landing. Foto diam di tempat (sticky) sementara wordmark dan seluruh isi
 * di bawahnya (`children`) naik menutupinya saat di-scroll, seperti palette.supply.
 */
export function Hero({ children }: { children: ReactNode }) {
  return (
    <section>
      <div className="sticky top-0 h-440 w-full overflow-hidden bg-subtle md:h-480 lg:h-640">
        <Image
          src="/images/hero.jpg"
          alt="Dua orang memakai pakaian thrift: rompi rajut, kemeja kotak, dan jaket kulit"
          fill
          priority
          sizes="100vw"
          // Posisi foto mengikuti Figma per layar: di ponsel dan tablet foto digeser ke
          // kanan supaya kedua orang masuk bingkai, di desktop rata atas supaya kepala
          // tidak terpotong. hero-recede: foto mengecil dan meredup saat tertutup.
          className="hero-recede object-cover object-[93%_0%] md:object-[100%_0%] lg:object-top"
        />
      </div>

      {/* Panel buram yang menimpa foto. Bayangan atas memberi kesan lapisan. */}
      <div className="relative z-10 bg-canvas shadow-[0_-16px_40px_rgb(30_30_28/0.12)]">
        <div className="flex flex-col gap-24 border-b border-line px-16 pt-24 pb-40 md:px-24 lg:gap-28 lg:px-48 lg:pt-32 lg:pb-56">
          <h1 className="overflow-hidden">
            {/* 18.5vw membuat wordmark kira-kira selebar area isi di setiap layar. */}
            <Logo size="clamp(56px, 18.5vw, 267px)" />
          </h1>

          <div className="flex flex-col gap-16 lg:flex-row lg:items-center lg:justify-between lg:gap-24">
            <p className="font-mono text-caption tracking-[0.09em]">PILIHAN LAMA · CERITA BARU</p>
            <p className="text-base leading-normal md:text-lg lg:w-520">
              Thrift pilihan dari satu toko. Setiap barang hanya ada satu, jadi yang kamu lihat
              benar-benar satu-satunya.
            </p>
            <ButtonLink href="/katalog" className="px-26 max-md:w-full md:self-start lg:self-auto">
              Jelajahi koleksi →
            </ButtonLink>
          </div>
        </div>

        {children}
      </div>
    </section>
  );
}
