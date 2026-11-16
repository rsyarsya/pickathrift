"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { GOOGLE_CLIENT_ID } from "@/lib/env";
import styles from "./auth.module.css";

type GoogleIdentity = {
  initialize(options: {
    client_id: string;
    callback: (response: { credential: string }) => void;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, string | number>): void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } };
  }
}

// initialize() cukup sekali per halaman; callback-nya meneruskan ke tombol yang sedang tampil.
let currentHandler: ((credential: string) => void) | null = null;
let initialized = false;

/**
 * Tombol resmi Google Identity Services untuk Buyer. Tidak tampil kalau
 * NEXT_PUBLIC_GOOGLE_CLIENT_ID kosong.
 */
export function GoogleSignIn({
  mode,
  disabled,
  onCredential,
}: {
  mode: "signin" | "signup";
  disabled?: boolean;
  onCredential: (credential: string) => void;
}) {
  const slot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    currentHandler = onCredential;
    return () => {
      if (currentHandler === onCredential) currentHandler = null;
    };
  }, [onCredential]);

  if (!GOOGLE_CLIENT_ID) return null;

  function render() {
    const identity = window.google?.accounts.id;
    const parent = slot.current;
    if (!identity || !parent) return;
    if (!initialized) {
      identity.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => currentHandler?.(response.credential),
      });
      initialized = true;
    }
    parent.replaceChildren();
    identity.renderButton(parent, {
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "pill",
      text: mode === "signup" ? "signup_with" : "signin_with",
      logo_alignment: "center",
      locale: "id",
      // Google membatasi lebar tombol 200–400 px.
      width: Math.min(400, Math.max(200, Math.floor(parent.clientWidth))),
    });
  }

  return (
    <>
      <div className={styles.divider} role="separator">
        <span>atau</span>
      </div>
      <div
        ref={slot}
        className={styles.googleButton}
        aria-disabled={disabled || undefined}
        aria-busy={disabled || undefined}
      />
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={render}
      />
    </>
  );
}
