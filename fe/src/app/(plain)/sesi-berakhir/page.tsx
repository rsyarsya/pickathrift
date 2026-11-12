import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { SystemState } from "@/components/ui/SystemState";
import { buyerReturnPath } from "@/modules/auth/lib/return-path";

export const metadata: Metadata = { title: "Sesi berakhir" };

/**
 * X1.6 Sesi berakhir. Dituju saat backend menjawab 401 untuk Buyer; `?kembali=` membawa
 * halaman yang sedang dibuka supaya dibuka lagi setelah masuk.
 */
export default async function SessionExpiredPage({ searchParams }: PageProps<"/sesi-berakhir">) {
  const { kembali } = await searchParams;
  const back = buyerReturnPath(typeof kembali === "string" ? kembali : null);
  const login = back === "/" ? "/masuk" : `/masuk?kembali=${encodeURIComponent(back)}`;
  return (
    <SystemState
      banner={{ text: "Sesi kamu berakhir. Masuk lagi untuk melanjutkan.", tone: "warning" }}
      icon="clock"
      tone="warning"
      title="Masuk lagi untuk melanjutkan"
      description="Demi keamanan, sesi berakhir setelah lama tidak aktif. Halaman yang tadi kamu buka akan dibuka lagi setelah masuk."
      actions={
        <>
          <ButtonLink href={login} size="md" className="max-sm:w-full">
            Masuk
          </ButtonLink>
          <ButtonLink href="/" variant="outline" size="md" className="max-sm:w-full">
            Ke beranda
          </ButtonLink>
        </>
      }
      footnote="KODE · 401"
    />
  );
}
