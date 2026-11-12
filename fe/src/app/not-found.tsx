import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { ButtonLink } from "@/components/ui/Button";
import { SystemState } from "@/components/ui/SystemState";

export const metadata: Metadata = { title: "Halaman tidak ditemukan" };

/** X1.1 Halaman tidak ditemukan, untuk semua rute yang tidak ada. */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="flex-1">
        <SystemState
          bigCode="404"
          title="Halaman ini tidak ada di rak"
          description="Mungkin tautannya salah, atau barangnya sudah tidak dijual lagi. Barang thrift memang cepat berganti."
          actions={
            <>
              <ButtonLink href="/katalog" size="md" className="max-sm:w-full">
                Ke katalog
              </ButtonLink>
              <ButtonLink href="/" variant="outline" size="md" className="max-sm:w-full">
                Kembali ke beranda
              </ButtonLink>
            </>
          }
          suggestCategories
          footnote="KODE · 404"
        />
      </main>
    </div>
  );
}
