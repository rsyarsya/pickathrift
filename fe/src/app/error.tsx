"use client";

import { useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SystemState } from "@/components/ui/SystemState";

/** X1.2 Terjadi kesalahan: galat tak terduga di halaman mana pun. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const ref = error.digest ? ` · REF ${error.digest.slice(0, 7).toUpperCase()}` : "";

  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="flex-1">
        <SystemState
          icon="alert"
          tone="danger"
          title="Ada yang tidak beres di sisi kami"
          description="Bukan salahmu. Coba muat ulang sebentar lagi. Kalau masih terjadi, kabari kami lewat kontak di footer."
          actions={
            <>
              <Button size="md" onClick={reset} className="max-sm:w-full">
                Muat ulang
              </Button>
              <ButtonLink href="/" variant="outline" size="md" className="max-sm:w-full">
                Kembali ke beranda
              </ButtonLink>
            </>
          }
          footnote={`KODE · 500${ref}`}
        />
      </main>
    </div>
  );
}
