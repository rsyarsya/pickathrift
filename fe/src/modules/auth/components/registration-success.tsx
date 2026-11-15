"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { AuthUser } from "../lib/auth-service";
import styles from "./auth.module.css";

export function RegistrationSuccess({ user }: { user: AuthUser }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const firstName = user.name.trim().split(/\s+/)[0];

  useEffect(() => {
    window.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className={styles.registrationSuccess}>
      <Link href="/" className={styles.backLink}>
        ← Kembali ke beranda
      </Link>
      <div className={styles.successBody}>
        <div className={styles.successHeading}>
          <span className={styles.successMark} aria-hidden="true">
            ✓
          </span>
          <h1
            id="auth-title"
            ref={heading}
            tabIndex={-1}
            className={`${styles.title} ${styles.successTitle}`}
          >
            Akun dibuat. Selamat datang, {firstName}!
          </h1>
          <p className={styles.successCopy}>Akunmu sudah tersimpan. Masuk untuk melanjutkan.</p>
        </div>
        <div className={styles.successActions}>
          <Link href="/masuk" className={styles.submitButton}>
            Masuk ke akun →
          </Link>
          <Link href="/" className={styles.secondaryButton}>
            Nanti saja, mulai belanja
          </Link>
        </div>
      </div>
    </div>
  );
}
