import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";

export type AsyncState<T> =
  | { status: "loading"; data?: T }
  | { status: "success"; data: T }
  | { status: "error"; error: ApiError; data?: T };

/**
 * Menjalankan pemanggilan data dan melacak loading/sukses/galat. `deps` menentukan
 * kapan dipanggil ulang; `reload()` untuk tombol "Coba lagi". Data lama tetap ada
 * selama memuat ulang, jadi "Muat lebih banyak" tidak mengosongkan layar.
 */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState((prev) => ({ status: "loading", data: prev.data }));
    load().then(
      (data) => active && setState({ status: "success", data }),
      (error: unknown) =>
        active &&
        setState((prev) => ({
          status: "error",
          data: prev.data,
          error: error instanceof ApiError ? error : new ApiError(0, "Terjadi kesalahan."),
        })),
    );
    return () => {
      active = false;
    };
    // deps dipilih pemanggil, sama seperti useEffect.
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}
