"use client";

import Link from "next/link";
import { useRef } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/layout/Logo";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { SearchBox } from "@/components/layout/SearchBox";
import { buttonClass } from "@/components/ui/Button";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";
import { useSession } from "@/modules/auth/useSession";

const NAV_LINKS = [
  { href: "/katalog", label: "Koleksi" },
  { href: "/cari-yang-cocok", label: "Cari yang Cocok" },
  { href: "/meja-perbandingan", label: "Meja Perbandingan" },
  { href: "/ulasan", label: "Ulasan" },
];

const iconLink = "flex size-32 items-center justify-center rounded-full hover:bg-fg/5";

export function Navbar() {
  const menu = useRef<HTMLDialogElement>(null);
  const { isLoggedIn } = useSession();
  const hidden = useHideOnScroll();

  return (
    <header
      // Ikut layar, sembunyi saat scroll ke bawah, muncul lagi saat scroll ke atas.
      // focus-within: tetap terlihat saat pengguna keyboard berpindah ke navbar.
      className={cn(
        "sticky top-0 z-40 bg-canvas transition-transform duration-300 ease-out focus-within:translate-y-0 motion-reduce:transition-none",
        hidden && "-translate-y-full",
      )}
    >
      <p className="bg-night py-10 text-center font-mono text-xs tracking-label text-night-fg">
        SATU TOKO · SATU UNIT PER BARANG
        <span className="hidden lg:inline"> · ONGKIR TETAP RP 15.000</span>
      </p>

      <nav
        aria-label="Navigasi utama"
        className="flex items-center justify-between gap-16 border-b border-line px-16 py-14 md:px-24 lg:px-48 lg:py-20"
      >
        <div className="flex items-center gap-12 lg:hidden">
          <button
            type="button"
            className={iconLink}
            aria-label="Buka menu"
            onClick={() => menu.current?.showModal()}
          >
            <Icon name="menu" size={22} />
          </button>
          <Logo size={22} />
        </div>

        <ul className="hidden flex-1 gap-28 text-body whitespace-nowrap lg:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="hover:underline">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden shrink-0 lg:block">
          <Logo />
        </div>

        <div className="flex items-center justify-end gap-8 lg:flex-1 lg:gap-12">
          <SearchBox />
          <button
            type="button"
            className={cn(iconLink, "lg:hidden")}
            aria-label="Cari barang"
            onClick={() => menu.current?.showModal()}
          >
            <Icon name="search" size={20} />
          </button>
          <Link href="/wishlist" className={iconLink} aria-label="Wishlist">
            <Icon name="heart" size={22} />
          </Link>
          <Link href="/pesanan" className={iconLink} aria-label="Pesanan saya">
            <Icon name="bag" size={22} />
          </Link>
          {isLoggedIn ? (
            <Link
              href="/profil"
              className={cn(iconLink, "hidden lg:flex")}
              aria-label="Profil saya"
            >
              <Icon name="user" size={22} />
            </Link>
          ) : (
            <Link href="/masuk" className={buttonClass("primary", "sm", "hidden lg:inline-flex")}>
              Masuk
            </Link>
          )}
        </div>
      </nav>

      <MobileMenu ref={menu} />
    </header>
  );
}
