"use client";

import { useRef, useState } from "react";
import { AUTH_SIMULATION_ENABLED } from "@/lib/env";
import { MockAuthError, type MockUser } from "../lib/mock-auth";

export type AuthFeedbackState = { kind: "success" | "error"; message: string };

export function useAuthSimulation() {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<AuthFeedbackState | null>(null);
  const inFlight = useRef(false);

  async function submit(
    action: () => Promise<MockUser>,
    successMessage: (user: MockUser) => string,
  ) {
    if (!AUTH_SIMULATION_ENABLED || inFlight.current) return;
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
        message: error instanceof MockAuthError ? error.message : "Permintaan gagal. Coba lagi.",
      });
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return { pending, feedback, submit, clearFeedback: () => setFeedback(null) };
}
