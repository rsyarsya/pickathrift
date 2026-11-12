import { createStore } from "@/lib/store";

/** Sesi admin berakhir kalau tidak ada aktivitas selama ini (M4.2). */
export const ADMIN_IDLE_MS = 2 * 60 * 60 * 1000;

export type AdminSession = { name: string; email: string; lastActiveAt: number };
export type AdminSessionStatus = "none" | "active" | "expired";

/*
 * Sesi admin, terpisah dari sesi Buyer. SEMENTARA disimpan di localStorage dan diisi
 * oleh simulasi auth di /admin/masuk. Begitu backend ada, status dan kedaluwarsanya
 * datang dari GET /auth/me (401 = sesi berakhir).
 */
const store = createStore<AdminSession | null>(null, "pickathrift.admin-session");

export function adminSessionStatus(session: AdminSession | null, now: number): AdminSessionStatus {
  if (!session) return "none";
  return now - session.lastActiveAt > ADMIN_IDLE_MS ? "expired" : "active";
}

export function useAdminSession() {
  const session = store.use();
  return {
    session,
    logIn: (user: { name: string; email: string }) =>
      store.set({ name: user.name, email: user.email, lastActiveAt: Date.now() }),
    logOut: () => store.set(null),
    /** Catat aktivitas. Dibatasi sekali per menit supaya tidak menulis di setiap render. */
    touch() {
      const current = store.get();
      if (current && Date.now() - current.lastActiveAt > 60_000) {
        store.set({ ...current, lastActiveAt: Date.now() });
      }
    },
  };
}
