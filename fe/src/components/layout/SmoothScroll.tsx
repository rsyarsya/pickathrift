"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useEffect } from "react";

/**
 * Smooth scroll Lenis untuk seluruh situs. Scroll tetap native (Lenis hanya menghaluskan
 * gerakannya), jadi `position: sticky` dan animasi `animation-timeline: scroll()` tetap jalan.
 * Mati kalau pengguna memilih "kurangi animasi".
 */
export function SmoothScroll() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      stopInertiaOnNavigate: true,
      // Area yang bisa di-scroll sendiri (daftar panjang, lembar filter) tetap scroll native.
      allowNestedScroll: true,
      // Dialog modal (menu ponsel, filter, konfirmasi) tidak ikut dihaluskan.
      prevent: (node) => node.closest("dialog") !== null,
    });
    return () => lenis.destroy();
  }, []);

  return null;
}
