"use client";

import { useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import type { AuthUser } from "../lib/auth-service";

export type AuthFeedbackState = { kind: "success" | "error"; message: string };

export function useAuthSubmit() {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<AuthFeedbackState | null>(null);
  const inFlight = useRef(false);

  async function submit(
    action: () => Promise<AuthUser>,
    successMessage: (user: AuthUser) => string,
  ) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setFeedback(null);
    try {
      const user = await action();
      setFeedback({ kind: "success", message: successMessage(user) });
      return user;
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof ApiError ? error.message : "Permintaan gagal. Coba lagi.",
      });
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return { pending, feedback, submit, clearFeedback: () => setFeedback(null) };
}
