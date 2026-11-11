"use client";

import Form from "next/form";
import Link from "next/link";
import type { MouseEvent, Ref } from "react";
import { buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/layout/Logo";
import { useCompare } from "@/modules/compare/useCompare";
import { useSession } from "@/modules/auth/useSession";
import { useWishlist } from "@/modules/wishlist/useWishlist";

const CATEGORY_CHIPS = [
  { label: "Jaket", className: "bg-peach" },
  { label: "Kaos", className: "bg-lilac" },
  { label: "Kemeja", className: "bg-butter" },
  { label: "Celana", className: "bg-mint" },
];

/** Laci menu ponsel dan tablet (Figma "Ponsel · menu terbuka · Buyer"). */
export function MobileMenu({ ref }: { ref: Ref<HTMLDialogElement> }) {
  const wishlist = useWishlist();
  const session = useSession();
  const compare = useCompare();

  const links = [
    { href: "/katalog", label: "Koleksi" },
    { href: "/cari-yang-cocok", label: "Cari yang Cocok" },
    { href: "/meja-perbandingan", label: "Meja Perbandingan", count: compare.ids.length },
    { href: "/ulasan", label: "Ulasan toko" },
    { href: "/wishlist", label: "Wishlist", count: wishlist.ids.length },
    { href: "/pesanan", label: "Pesanan saya" },
  ];

  // Klik pada tautan atau latar menutup laci.
  function closeOnNavigate(event: MouseEvent<HTMLDialogElement>) {
    const target = event.target as HTMLElement;
    if (target === event.currentTarget || target.closest("a")) event.currentTarget.close();
  }

  return (
    <dialog
      ref={ref}
      aria-label="Menu"
      onClick={closeOnNavigate}
      className="m-0 h-dvh max-h-none w-full max-w-390 bg-canvas p-0 text-fg"
    >
      <div className="flex min-h-full flex-col gap-24 p-20">
        <div className="flex items-center justify-between">
          <Logo size={22} />
          <form method="dialog">
            <button className="flex size-32 items-center justify-center" aria-label="Tutup menu">
              <Icon name="close" size={20} />
            </button>
          </form>
        </div>

        <Form
          action="/katalog"
          role="search"
          onSubmit={(e) => (e.currentTarget.closest("dialog") as HTMLDialogElement).close()}
          className="flex items-center gap-10 rounded-full border border-line bg-surface px-16 py-12 focus-within:border-fg"
        >
          <Icon name="search" className="shrink-0 text-muted" />
          <input
            name="q"
            type="search"
            placeholder="Cari jaket, kaos, merek…"
            aria-label="Cari barang"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </Form>

        <ul>
          {links.map((link) => (
            <li key={link.href} className="border-b border-line">
              <Link
                href={link.href}
                className="flex items-center justify-between py-18 text-[26px] tracking-[-0.02em]"
              >
                {link.label}
                {!!link.count && <span className="font-mono text-xs text-muted">{link.count}</span>}
              </Link>
            </li>
          ))}
        </ul>

        <ul className="flex flex-wrap gap-8">
          {CATEGORY_CHIPS.map((chip) => (
            <li key={chip.label}>
              <Link
                href={`/katalog?kategori=${chip.label}`}
                className={`${chip.className} inline-block rounded-full px-14 py-7 text-sm`}
              >
                {chip.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex flex-col gap-10">
          {session.isLoggedIn ? (
            <>
              <Link href="/profil" className={buttonClass("primary", "md")}>
                Profil saya
              </Link>
              <form method="dialog">
                <button onClick={session.logOut} className={buttonClass("outline", "md", "w-full")}>
                  Keluar
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/masuk" className={buttonClass("primary", "md")}>
                Masuk
              </Link>
              <Link href="/daftar" className={buttonClass("outline", "md")}>
                Daftar
              </Link>
            </>
          )}
          <p className="font-mono text-nano tracking-label text-muted">
            SATU TOKO · SATU UNIT PER BARANG
          </p>
        </div>
      </div>
    </dialog>
  );
}
