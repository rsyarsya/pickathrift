"use client";
import { useEffect, useState, type ReactNode } from "react";
import { restoreSession } from "../lib/auth-service";
export function AuthBoundary({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    restoreSession()
      .then(() => {
        if (active) setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  if (status === "loading")
    return (
      <p className="p-24" role="status">
        Memeriksa sesi…
      </p>
    );
  if (status === "error")
    return (
      <div className="p-24">
        <p role="alert">Tidak bisa memeriksa sesi. Periksa koneksi ke server.</p>
        <button
          onClick={() => {
            setStatus("loading");
            setAttempt(attempt + 1);
          }}
        >
          Coba lagi
        </button>
      </div>
    );
  return children;
}
