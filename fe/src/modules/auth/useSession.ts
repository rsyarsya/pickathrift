import { createStore } from "@/lib/store";

/*
 * Status masuk Buyer. SEMENTARA hanya penanda di localStorage supaya navbar bisa
 * menampilkan versi tamu dan versi Buyer. Begitu Auth (A1/A2) dan backend ada, isinya
 * diambil dari GET /auth/me lewat api(), dan logOut() memanggil POST /auth/logout.
 */
const store = createStore<boolean>(false, "pickathrift.session");

export function useSession() {
  const isLoggedIn = store.use();
  return {
    isLoggedIn,
    logIn: () => store.set(true),
    logOut: () => store.set(false),
  };
}
