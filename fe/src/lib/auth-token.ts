const KEY = "pickathrift.auth-token";
let memoryToken: string | null = null;
let memoryOnly = false;
const listeners = new Set<() => void>();
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  if (memoryOnly) return memoryToken;
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return memoryToken;
  }
}
export function setToken(token: string | null) {
  memoryToken = token;
  if (typeof window !== "undefined") {
    try {
      if (token) window.sessionStorage.setItem(KEY, token);
      else window.sessionStorage.removeItem(KEY);
      memoryOnly = false;
    } catch {
      memoryOnly = true;
    }
  }
  if (!token) listeners.forEach((listener) => listener());
}
export function onTokenCleared(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
