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

const label = "font-mono text-xs tracking-label text-muted";

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
      <label htmlFor="newsletter" className="text-base font-medium">
        Kabari aku kalau ada barang baru
      </label>
      <div
        className={cn(
          "flex items-center justify-between rounded-full border bg-surface py-6 pr-6 pl-18",
          state === "error" ? "border-danger" : "border-line focus-within:border-fg",
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
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
        />
        <button
          disabled={busy}
          className="rounded-full bg-fg px-18 py-10 text-sm font-medium text-canvas disabled:opacity-70"
        >
          {state === "loading" ? "Mengirim…" : state === "success" ? "✓ Terdaftar" : "Daftar"}
        </button>
      </div>
      <p
        id="newsletter-help"
        aria-live="polite"
        className={cn("text-caption", state === "error" ? "text-danger" : "text-muted")}
      >
        {message}
      </p>
    </form>
  );
}

export function Footer() {
  return (
    // Overlap ala palette.supply: tautan menggulung biasa, wordmark di bawahnya menempel di
    // dasar layar (sticky) sehingga terbuka saat tautan naik.
    <footer className="text-fg">
      <div className="relative z-10 flex flex-col gap-40 border-t border-line bg-canvas px-16 pt-48 pb-24 shadow-[0_16px_32px_rgb(30_30_28/0.08)] md:px-24 lg:gap-56 lg:px-48 lg:pt-64 lg:pb-32">
        <div className="grid grid-cols-2 gap-x-24 gap-y-32 lg:flex lg:gap-48">
          <div className="lg:w-160">
            <Column title="BELANJA" links={SHOP} />
          </div>
          <div className="lg:w-160">
            <Column title="FITUR" links={FEATURES} />
          </div>
          <div className="lg:w-160">
            <Column title="BANTUAN" links={HELP} />
          </div>
          <div className="col-span-2 lg:ml-auto lg:w-340">
            <Newsletter />
          </div>
        </div>
        <p className={`${label} border-t border-line pt-16`}>© 2026 PickaThrift · Kelompok 19</p>
      </div>

      {/* Wordmark besar selebar area isi sebagai penutup halaman (DS-002). */}
      {/* Blok gelap selebar layar, rasio 7:3 seperti palette.supply. Wordmark membentang dengan
          jarak 4% ke tepi kiri-kanan, di tengah secara vertikal. */}
      <div className="footer-reveal sticky bottom-0 flex aspect-[7/3] items-center overflow-hidden bg-night px-[4vw]">
        <Logo tone="light" className="flex w-full [&>svg]:h-auto [&>svg]:w-full" />
      </div>
    </footer>
  );
}
