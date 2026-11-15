"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { SystemState } from "@/components/ui/SystemState";

const RETRY_SECONDS = 5;

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * X1.4 Sedang offline. Saat browser kehilangan koneksi, isi halaman diganti layar offline
 * dan otomatis kembali begitu online.
 */
export function OfflineGate({ children }: { children: ReactNode }) {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  const [seconds, setSeconds] = useState(RETRY_SECONDS);
  // Hitung mundur ulang terus selama offline; event "online" yang memulihkan halaman.
  useEffect(() => {
    if (online) return;
    const timer = setInterval(() => setSeconds((s) => (s <= 1 ? RETRY_SECONDS : s - 1)), 1000);
    return () => clearInterval(timer);
  }, [online]);

  if (online) return children;

  return (
    <SystemState
      banner={{ text: "Kamu sedang offline. Kami coba sambungkan lagi otomatis.", tone: "dark" }}
      icon="wifiOff"
      title="Tidak ada koneksi internet"
      description="Periksa Wi-Fi atau data selulermu. Wishlist dan meja perbandinganmu aman, tapi pembelian baru bisa dilakukan saat online."
      actions={
        <Button size="md" onClick={() => setSeconds(RETRY_SECONDS)}>
          Coba lagi
        </Button>
      }
      footnote={`MENCOBA LAGI DALAM ${seconds} DETIK…`}
    />
  );
}
