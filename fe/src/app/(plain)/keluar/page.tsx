import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { SystemState } from "@/components/ui/SystemState";

export const metadata: Metadata = { title: "Sudah keluar" };

/** X1.5 Sudah keluar: tujuan setelah Buyer menekan Keluar. */
export default function LoggedOutPage() {
  return (
    <SystemState
      icon="logOut"
      tone="success"
      title="Kamu sudah keluar"
      description="Sampai jumpa lagi. Wishlist dan pesananmu tersimpan di akun, tinggal masuk untuk melihatnya."
      actions={
        <>
          <ButtonLink href="/masuk" size="md" className="max-sm:w-full">
            Masuk lagi
          </ButtonLink>
          <ButtonLink href="/katalog" variant="outline" size="md" className="max-sm:w-full">
            Lanjut lihat-lihat
          </ButtonLink>
        </>
      }
    />
  );
}
