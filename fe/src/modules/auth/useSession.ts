import { authState, logout } from "./lib/auth-service";
export type SessionUser = { name: string; email: string };
export function useSession() {
  const state = authState.use();
  const user = state.user?.role === "buyer" ? state.user : null;
  return {
    user,
    isLoggedIn: user !== null,
    logOut: logout,
    updateName(email: string, name: string) {
      const current = authState.get();
      if (current.user?.email === email)
        authState.set({ ...current, user: { ...current.user, name } });
    },
  };
}
