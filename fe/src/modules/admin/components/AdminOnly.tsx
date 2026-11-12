"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useSession } from "@/modules/auth/useSession";
import { AccessDenied, SessionExpired } from "@/modules/admin/components/AdminAccess";
import { adminSessionStatus, useAdminSession } from "@/modules/admin/useAdminSession";

const subscribe = () => () => {};

/**
 * Penjaga semua halaman admin (M4). Belum masuk → /admin/masuk; masuk sebagai Buyer →
 * M4.1 Akses ditolak; sesi admin kedaluwarsa → M4.2 Sesi berakhir.
 * `?demo=ditolak` dan `?demo=sesi-berakhir` memaksa kedua layar itu.
 */
export function AdminOnly({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const demo = params.get("demo");
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
  const denied = demo === "ditolak" || (status === "none" && buyer.isLoggedIn);
  const expired = demo === "sesi-berakhir" || status === "expired";

  useEffect(() => {
    if (hydrated && status === "none" && !buyer.isLoggedIn && !demo) router.replace(loginHref);
  }, [hydrated, status, buyer.isLoggedIn, demo, router, loginHref]);

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
    return (
      <SessionExpired
        email={admin.session?.email ?? "admin@pickathrift.test"}
        onLoggedIn={(user) => {
          admin.logIn(user);
          if (demo) router.replace(pathname);
        }}
      />
    );
  }
  if (denied) {
    return (
      <AccessDenied
        buyerName={buyer.user?.name ?? (demo ? "Dinda" : undefined)}
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
