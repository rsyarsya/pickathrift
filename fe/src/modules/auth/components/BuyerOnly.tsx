"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { useSession, type SessionUser } from "../useSession";

const subscribe = () => () => {};

export function BuyerOnly({
  children,
}: {
  children: (user: SessionUser, logout: () => void) => ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const { user, isLoggedIn, logOut } = useSession();
  const loggingOut = useRef(false);
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (hydrated && !isLoggedIn && !loggingOut.current) {
      const next = pathname + (query ? `?${query}` : "");
      router.replace(`/masuk?kembali=${encodeURIComponent(next)}`);
    }
  }, [hydrated, isLoggedIn, pathname, query, router]);

  if (!hydrated || !user)
    return (
      <p className="p-16" role="status">
        Memuat sesi Buyer…
      </p>
    );
  return children(user, () => {
    loggingOut.current = true;
    logOut();
    router.replace("/keluar");
  });
}
