"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Smooth scroll Lenis untuk seluruh situs. Scroll tetap native (Lenis hanya menghaluskan
 * gerakannya), jadi `position: sticky` dan animasi `animation-timeline: scroll()` tetap jalan.
 * Mati kalau pengguna memilih "kurangi animasi".
 */
export function SmoothScroll() {
  const lenis = useRef<Lenis | null>(null);
  const fromHistory = useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const instance = new Lenis({
      autoRaf: true,
      anchors: true,
      stopInertiaOnNavigate: true,
      // Area yang bisa di-scroll sendiri (daftar panjang, lembar filter) tetap scroll native.
      allowNestedScroll: true,
      // Dialog modal (menu ponsel, filter, konfirmasi) tidak ikut dihaluskan.
      prevent: (node) => node.closest("dialog") !== null,
    });
    lenis.current = instance;
    // Back/Forward: biarkan browser mengembalikan posisi scroll sebelumnya.
    const onPopState = () => (fromHistory.current = true);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      instance.destroy();
      lenis.current = null;
    };
  }, []);

  // Pindah halaman lewat tautan: mulai dari atas. Tanpa ini Lenis menahan posisi scroll
  // halaman sebelumnya, jadi halaman baru terbuka di tengah atau bawah. Ganti filter
  // (query string) tidak mengubah pathname, jadi posisi katalog tetap.
  useEffect(() => {
    if (fromHistory.current) {
      fromHistory.current = false;
      return;
    }
    lenis.current?.scrollTo(0, { immediate: true, force: true });
  }, [pathname]);

  return null;
}
