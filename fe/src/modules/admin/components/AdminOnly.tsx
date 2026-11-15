"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useSession } from "@/modules/auth/useSession";
import { AccessDenied, SessionExpired } from "@/modules/admin/components/AdminAccess";
import { adminSessionStatus, useAdminSession } from "@/modules/admin/useAdminSession";

const subscribe = () => () => {};

/**
 * Penjaga semua halaman admin (M4). Belum masuk → /admin/masuk; masuk sebagai Buyer →
 * M4.1 Akses ditolak; sesi admin kedaluwarsa → M4.2 Sesi berakhir.
 */
export function AdminOnly({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const buyer = useSession();
  const admin = useAdminSession();
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  // Dihitung saat render: cukup untuk sesi yang kedaluwarsa dalam hitungan jam.
  const status = hydrated ? adminSessionStatus(admin.session, Date.now()) : "none";
  const loginHref = `/admin/masuk?kembali=${encodeURIComponent(pathname)}`;
  const denied = status === "none" && buyer.isLoggedIn;
  const expired = status === "expired";

  useEffect(() => {
    if (hydrated && status === "none" && !buyer.isLoggedIn) router.replace(loginHref);
  }, [hydrated, status, buyer.isLoggedIn, router, loginHref]);

  // Setiap pindah halaman admin dihitung sebagai aktivitas.
  const { touch } = admin;
  useEffect(() => {
    if (status === "active") touch();
  }, [pathname, status, touch]);

  if (!hydrated) {
    return (
      <p className="p-24" role="status">
        Memuat sesi admin…
      </p>
    );
  }
  if (expired) {
    return <SessionExpired email={admin.session?.email ?? ""} />;
  }
  if (denied) {
    return (
      <AccessDenied
        buyerName={buyer.user?.name}
        onSwitch={() => {
          buyer.logOut();
          router.push(loginHref);
        }}
      />
    );
  }
  if (status !== "active") {
    return (
      <p className="p-24" role="status">
        Mengalihkan ke halaman masuk admin…
      </p>
    );
  }
  return children;
}
