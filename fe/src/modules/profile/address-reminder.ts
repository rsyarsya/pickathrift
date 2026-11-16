const key = (userId: string) => `pickathrift.addressReminder.closed.${userId}`;

/** Pengingat tampil untuk Buyer yang alamatnya sudah pasti kosong, kecuali di halaman profil. */
export function shouldRemindAddress(
  user: { id: string; address?: object | null } | null,
  pathname: string,
) {
  return user !== null && user.address === null && !pathname.startsWith("/profil");
}

export function reminderClosed(userId: string) {
  try {
    return localStorage.getItem(key(userId)) === "1";
  } catch {
    return false;
  }
}

export function closeReminder(userId: string) {
  try {
    localStorage.setItem(key(userId), "1");
  } catch {
    // Tanpa penyimpanan browser, pengingat tetap tertutup sampai halaman dimuat ulang.
  }
}
