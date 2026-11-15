import { api, ApiError } from "@/lib/api";
import { getToken, setToken, onTokenCleared } from "@/lib/auth-token";
import { createStore } from "@/lib/store";
export type AuthRole = "buyer" | "admin";
export type AuthUser = { id: string; name: string; email: string; role: AuthRole };
type Envelope<T> = { success: true; data: T };
export const authState = createStore<{ user: AuthUser | null; lastActiveAt: number }>({
  user: null,
  lastActiveAt: 0,
});
onTokenCleared(() => authState.set({ user: null, lastActiveAt: 0 }));
export function logout() {
  setToken(null);
}
export async function register(values: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}) {
  const result = await api<Envelope<AuthUser>>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(values),
  });
  return result.data;
}
export async function login(values: { email: string; password: string }, role: AuthRole) {
  const result = await api<Envelope<{ token: string; user: AuthUser }>>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ ...values, role }),
  });
  setToken(result.data.token);
  authState.set({ user: result.data.user, lastActiveAt: Date.now() });
  return result.data.user;
}
export async function restoreSession() {
  const token = getToken();
  if (!token) {
    logout();
    return;
  }
  try {
    const result = await api<Envelope<AuthUser>>("/api/users/me");
    if (getToken() === token) authState.set({ user: result.data, lastActiveAt: Date.now() });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return;
    throw error;
  }
}
