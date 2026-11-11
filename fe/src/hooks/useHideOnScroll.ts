import { useEffect, useState } from "react";

/**
 * true saat pengguna menggulir ke bawah melewati `offset` piksel, false saat menggulir
 * ke atas. Gerakan di bawah `threshold` diabaikan supaya tidak berkedip saat scroll halus.
 */
export function useHideOnScroll(offset = 120, threshold = 8) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    function onScroll() {
      const y = window.scrollY;
      if (Math.abs(y - last) < threshold) return;
      setHidden(y > last && y > offset);
      last = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [offset, threshold]);

  return hidden;
}
