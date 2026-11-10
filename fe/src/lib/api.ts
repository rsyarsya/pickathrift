import { API_URL } from "@/lib/env";

/*
 * Satu pintu ke backend. Semua layar lewat sini, jadi penanganan galat, header, dan
 * base URL cuma ditulis sekali. Jangan panggil fetch langsung dari komponen.
 */

/** Galat yang datang dari backend, lengkap dengan status HTTP-nya. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      credentials: "include",
    });
  } catch {
    // Jaringan putus atau server mati: layar harus bisa membedakannya dari galat 4xx.
    throw new ApiError(0, "Tidak bisa menghubungi server. Periksa koneksimu.");
  }

  const body = await response.text();
  const data = body === "" ? null : safeParse(body);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      messageOf(data) ?? `Permintaan gagal (${response.status}).`,
    );
  }

  return data as T;
}

/** Backend diharapkan mengirim `{ message }` saat gagal. Kalau tidak, pakai pesan cadangan. */
function messageOf(data: unknown): string | null {
  if (data === null || typeof data !== "object") return null;
  const message = (data as { message?: unknown }).message;
  return typeof message === "string" && message !== "" ? message : null;
}

function safeParse(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}
