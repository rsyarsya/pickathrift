import { useCallback, useState } from "react";
import type { ToastData } from "@/components/ui/Toast";

export function useToast() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const show = useCallback(
    (message: string, action?: ToastData["action"]) =>
      setToast({ id: Date.now(), message, action }),
    [],
  );
  const clear = useCallback(() => setToast(null), []);
  return { toast, show, clear };
}
