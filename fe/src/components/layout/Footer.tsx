"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/layout/Logo";

const SHOP = [
  { href: "/katalog", label: "Semua koleksi" },
  { href: "/katalog?kategori=Jaket", label: "Jaket" },
  { href: "/katalog?kategori=Kaos", label: "Kaos" },
  { href: "/katalog?kategori=Kemeja", label: "Kemeja" },
  { href: "/katalog?kategori=Celana", label: "Celana" },
];
const FEATURES = [
  { href: "/cari-yang-cocok", label: "Cari yang Cocok" },
  { href: "/meja-perbandingan", label: "Meja Perbandingan" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/ulasan", label: "Ulasan toko" },
];
const HELP = [
  { href: "/pesanan", label: "Cara bayar" },
  { href: "/pesanan", label: "Status pesanan" },
  { href: "/profil", label: "Akun saya" },
];

const label = "font-mono text-xs tracking-label text-night-muted";

function Column({ title, links }: { title: string; links: typeof SHOP }) {
  return (
    <div className="flex flex-col gap-12">
      <p className={label}>{title}</p>
      {links.map((link) => (
        <Link key={link.label} href={link.href} className="text-body hover:underline">
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function Newsletter() {
  const [state, setState] = useState<"idle" | "invalid" | "done">("idle");

  return (
    <form
      noValidate
      className="flex flex-col gap-14"
      onSubmit={(event) => {
        event.preventDefault();
        const email = new FormData(event.currentTarget).get("email");
        // ponytail: hanya validasi format; belum ada endpoint newsletter di backend.
        setState(typeof email === "string" && /^\S+@\S+\.\S+$/.test(email) ? "done" : "invalid");
      }}
    >
      <label htmlFor="newsletter" className="text-lg font-medium">
        Kabari aku kalau ada barang baru
      </label>
      <div className="flex items-center justify-between rounded-full bg-night-raised py-6 pr-6 pl-18">
        <input
          id="newsletter"
          name="email"
          type="email"
          placeholder="Email kamu"
          aria-invalid={state === "invalid"}
          aria-describedby="newsletter-help"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-night-muted"
        />
        <button className="rounded-full bg-peach px-18 py-10 text-sm font-medium text-fg">
          Daftar
        </button>
      </div>
      <p id="newsletter-help" aria-live="polite" className="text-caption text-night-soft">
        {state === "invalid" && "Tulis email yang valid, misalnya nama@email.com."}
        {state === "done" && "Terima kasih, kamu akan dikabari."}
      </p>
    </form>
  );
}

export function Footer() {
  return (
    <footer className="flex flex-col gap-40 bg-night px-16 pt-48 pb-32 text-night-fg md:px-24 lg:gap-64 lg:px-48 lg:pt-72 lg:pb-40">
      <div className="grid grid-cols-2 gap-x-24 gap-y-32 lg:flex lg:gap-48">
        <div className="col-span-2 flex flex-col gap-16 lg:flex-1">
          <Logo size={36} tone="light" />
          <p className="max-w-320 text-base leading-normal text-night-soft">
            Thrift pilihan dari satu toko. Setiap barang cuma ada satu.
          </p>
        </div>
        <div className="col-span-2 lg:order-last lg:w-340">
          <Newsletter />
        </div>
        <div className="lg:w-160">
          <Column title="BELANJA" links={SHOP} />
        </div>
        <div className="lg:w-160">
          <Column title="FITUR" links={FEATURES} />
        </div>
        <div className="hidden lg:block lg:w-160">
          <Column title="BANTUAN" links={HELP} />
        </div>
        <div className="col-span-2 flex flex-wrap gap-x-16 gap-y-8 lg:hidden">
          {HELP.map((link) => (
            <Link key={link.label} href={link.href} className="text-caption underline">
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className={`${label} flex justify-between border-t border-night-line pt-24`}>
        <p>© 2026 PICKATHRIFT · KELOMPOK 19</p>
        <p className="hidden lg:block">SATU TOKO · SATU UNIT PER BARANG</p>
      </div>
    </footer>
  );
}
