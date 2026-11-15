import { authState, logout } from "@/modules/auth/lib/auth-service";
export const ADMIN_IDLE_MS = 2 * 60 * 60 * 1000;
export type AdminSession = { name: string; email: string; lastActiveAt: number };
export type AdminSessionStatus = "none" | "active" | "expired";
export function adminSessionStatus(session: AdminSession | null, now: number): AdminSessionStatus {
  if (!session) return "none";
  return now - session.lastActiveAt > ADMIN_IDLE_MS ? "expired" : "active";
}
function touch() {
  const current = authState.get();
  if (current.user?.role === "admin" && Date.now() - current.lastActiveAt > 60_000)
    authState.set({ ...current, lastActiveAt: Date.now() });
}
export function useAdminSession() {
  const state = authState.use();
  return {
    session:
      state.user?.role === "admin" ? { ...state.user, lastActiveAt: state.lastActiveAt } : null,
    logOut: logout,
    touch,
  };
}
