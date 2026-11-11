"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Logo } from "@/components/layout/Logo";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { subscribeNewsletter } from "@/modules/home/data/newsletter";

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

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Daftar kabar barang baru. Alur state (galat, mengirim, berhasil) dari Newsletter karya Ola. */
function Newsletter() {
  const [state, setState] = useState<"idle" | "error" | "loading" | "success">("idle");
  const [message, setMessage] = useState("");
  const busy = state === "loading" || state === "success";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!EMAIL.test(email)) {
      setState("error");
      setMessage("Format email belum benar. Contoh: nama@email.com");
      return;
    }
    setState("loading");
    setMessage("");
    try {
      await subscribeNewsletter(email);
      setState("success");
      setMessage("Siap! Kami kabari lewat email kalau ada barang baru.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof ApiError ? error.message : "Terjadi kesalahan. Coba lagi.");
    }
  }

  return (
    <form noValidate className="flex flex-col gap-14" onSubmit={submit}>
      <label htmlFor="newsletter" className="text-lg font-medium">
        Kabari aku kalau ada barang baru
      </label>
      <div
        className={cn(
          "flex items-center justify-between rounded-full border bg-night-raised py-6 pr-6 pl-18",
          state === "error" ? "border-danger" : "border-transparent focus-within:border-peach",
        )}
      >
        <input
          id="newsletter"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Email kamu"
          disabled={busy}
          onChange={() => state === "error" && setState("idle")}
          aria-invalid={state === "error"}
          aria-describedby="newsletter-help"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-night-muted"
        />
        <button
          disabled={busy}
          className="rounded-full bg-peach px-18 py-10 text-sm font-medium text-fg disabled:opacity-70"
        >
          {state === "loading" ? "Mengirim…" : state === "success" ? "✓ Terdaftar" : "Daftar"}
        </button>
      </div>
      <p
        id="newsletter-help"
        aria-live="polite"
        className={cn("text-caption", state === "error" ? "text-[#ff9d94]" : "text-night-soft")}
      >
        {message}
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
