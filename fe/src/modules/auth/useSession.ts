import { createStore } from "@/lib/store";

export type SessionUser = { name: string; email: string };

/*
 * Sesi Buyer. SEMENTARA disimpan di localStorage dan diisi oleh simulasi auth
 * (login-form, buyer-register-content). Begitu backend ada, isinya diambil dari
 * GET /auth/me lewat api(), dan logOut() memanggil POST /auth/logout.
 */
const store = createStore<SessionUser | null>(null, "pickathrift.session");

export function useSession() {
  const saved = store.use();
  // Versi lama menyimpan `true`; anggap belum masuk supaya nama tidak kosong.
  const user = saved !== null && typeof saved === "object" ? saved : null;
  return {
    user,
    isLoggedIn: user !== null,
    logIn: (next: SessionUser) => store.set({ name: next.name, email: next.email }),
    logOut: () => store.set(null),
  };
}
