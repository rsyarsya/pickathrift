const rupiah = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** 185000 → "Rp 185.000" */
export function formatRupiah(value: number): string {
  return `Rp ${rupiah.format(value)}`;
}

/** "Rp 250.000", "250000", "250.000" → 250000. Kosong atau bukan angka → null. */
export function parseRupiah(text: string): number | null {
  const digits = text.replace(/\D/g, "");
  return digits === "" ? null : Number(digits);
}

const DAY = 24 * 60 * 60 * 1000;

/** Umur unggahan dalam huruf kapital, seperti di label katalog: "3 HARI LALU". */
export function uploadedAgo(iso: string, now = Date.now()): string {
  const days = Math.floor((now - new Date(iso).getTime()) / DAY);
  if (days <= 0) return "HARI INI";
  if (days < 30) return `${days} HARI LALU`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months} BULAN LALU` : `${Math.floor(months / 12)} TAHUN LALU`;
}
