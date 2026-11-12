"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, type ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useAsync } from "@/hooks/useAsync";
import { cn } from "@/lib/cn";
import { AdminBadge } from "@/modules/admin/components/AdminAccess";
import { countPendingOrders } from "@/modules/admin/data/products";
import { useAdminSession } from "@/modules/admin/useAdminSession";

type NavItem = { href: string; label: string; icon: IconName; external?: boolean };

const NAV: NavItem[] = [
  { href: "/admin/produk", label: "Kelola produk", icon: "box" },
  { href: "/admin/pesanan", label: "Pesanan masuk", icon: "list" },
  { href: "/ulasan", label: "Ulasan toko", icon: "star" },
  { href: "/", label: "Lihat toko", icon: "external", external: true },
];

function NavLinks({ pending, onNavigate }: { pending?: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-4">
      {NAV.map((item) => {
        const active = !item.external && pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              target={item.external ? "_blank" : undefined}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-10 rounded-[8px] px-12 py-10 text-body",
                active
                  ? "bg-night-raised font-medium text-night-fg"
                  : "text-night-soft hover:bg-night-raised/60 hover:text-night-fg",
              )}
            >
              <Icon name={item.icon} size={18} />
              <span className="flex-1">{item.label}</span>
              {item.href === "/admin/pesanan" && !!pending && (
                <span
                  className="rounded-full bg-peach px-7 py-2 font-mono text-micro font-medium text-fg"
                  aria-label={`${pending} perlu diverifikasi`}
                >
                  {pending}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-8 [&_a]:text-night-fg">
      <Logo size={20} tone="light" />
      <AdminBadge />
    </div>
  );
}

/** Kerangka halaman admin: sidebar gelap di desktop, bar atas + laci menu di layar kecil. */
export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session, logOut } = useAdminSession();
  const pending = useAsync(countPendingOrders, []).data;
  const drawer = useRef<HTMLDialogElement>(null);

  function signOut() {
    logOut();
    router.replace("/admin/masuk");
  }

  const account = (
    <div className="flex flex-col gap-4 border-t border-night-line pt-16">
      <p className="text-sm font-medium text-night-fg">{session?.name ?? "Admin"}</p>
      <p className="font-mono text-micro text-night-soft">{session?.email}</p>
      <button
        type="button"
        onClick={signOut}
        className="self-start text-caption text-peach underline"
      >
        Keluar
      </button>
    </div>
  );

  return (
    <div className="min-h-dvh bg-canvas lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-248 shrink-0 flex-col justify-between bg-night px-20 pt-28 pb-24 lg:flex">
        <nav aria-label="Menu admin" className="flex flex-col gap-28">
          <Brand />
          <NavLinks pending={pending} />
        </nav>
        {account}
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between bg-night px-16 py-12 md:px-24 lg:hidden">
        <div className="flex items-center gap-12">
          <button
            type="button"
            onClick={() => drawer.current?.showModal()}
            aria-label="Buka menu admin"
            className="flex text-night-fg"
          >
            <Icon name="menu" size={22} />
          </button>
          <Brand />
        </div>
        <span
          aria-hidden
          className="flex size-36 items-center justify-center rounded-full bg-peach text-sm font-medium text-fg"
        >
          {(session?.name ?? "A").charAt(0).toUpperCase()}
        </span>
      </header>

      <dialog
        ref={drawer}
        aria-label="Menu admin"
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="m-0 h-dvh max-h-none w-full max-w-300 bg-night p-0 text-night-fg"
      >
        <div className="flex min-h-full flex-col justify-between gap-28 px-20 pt-20 pb-24">
          <div className="flex flex-col gap-28">
            <div className="flex items-center justify-between">
              <Brand />
              <form method="dialog">
                <button aria-label="Tutup menu" className="flex">
                  <Icon name="close" size={20} />
                </button>
              </form>
            </div>
            <NavLinks pending={pending} onNavigate={() => drawer.current?.close()} />
          </div>
          {account}
        </div>
      </dialog>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
