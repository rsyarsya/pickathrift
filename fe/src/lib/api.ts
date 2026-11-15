import { getToken, setToken } from "./auth-token";
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
    readonly code?: string,
    readonly errors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (init?.body instanceof FormData) {
    // Fetch perlu membuat Content-Type beserta boundary yang cocok dengan body.
    headers.delete("Content-Type");
  } else if (typeof init?.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (token && !path.startsWith("/api/auth/") && !headers.has("Authorization"))
    headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      credentials: "omit",
    });
  } catch {
    // Jaringan putus atau server mati: layar harus bisa membedakannya dari galat 4xx.
    throw new ApiError(0, "Tidak bisa menghubungi server. Periksa koneksimu.");
  }

  if (!response.ok) {
    const data = safeParse(await response.text());
    const details =
      data !== null && typeof data === "object"
        ? (data as { code?: unknown; errors?: unknown })
        : {};
    if (response.status === 401 && token && getToken() === token && !path.startsWith("/api/auth/"))
      setToken(null);
    throw new ApiError(
      response.status,
      messageOf(data) ?? `Permintaan gagal (${response.status}).`,
      typeof details.code === "string" ? details.code : undefined,
      details.errors !== null &&
        typeof details.errors === "object" &&
        !Array.isArray(details.errors)
        ? Object.fromEntries(
            Object.entries(details.errors).filter(
              (entry): entry is [string, string] => typeof entry[1] === "string",
            ),
          )
        : undefined,
    );
  }

  return response;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await request(path, init);
  const body = await response.text();
  return (body === "" ? null : safeParse(body)) as T;
}

/** Berkas privat memakai autentikasi dan penanganan galat yang sama dengan JSON. */
export async function apiBlob(path: string, init?: RequestInit): Promise<Blob> {
  return (await request(path, init)).blob();
}

/** Membuka bungkus respons sukses backend tanpa mengubah pemanggil api() lama. */
export async function apiData<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await api<{ success: true; data: T }>(path, init);
  return response.data;
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
