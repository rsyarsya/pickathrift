import { useCallback, useState } from "react";
import type { ToastData } from "@/components/ui/Toast";

export function useToast() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const show = useCallback(
    (message: string, action?: ToastData["action"]) =>
      setToast({ id: Date.now(), message, action }),
    [],
  );
  /** X1.7 Aksi gagal terkirim: pesan galat dengan tombol "Coba lagi". */
  const fail = useCallback(
    (message: string, retry?: () => void) =>
      setToast({ id: Date.now(), message, error: true, retry }),
    [],
  );
  const clear = useCallback(() => setToast(null), []);
  return { toast, show, fail, clear };
}
