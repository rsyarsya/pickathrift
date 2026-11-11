"use client";

import Link from "next/link";
import { useState } from "react";
import type { MockUser } from "../lib/mock-auth";
import { useSession } from "../useSession";
import { BuyerRegisterForm } from "./buyer-register-form";
import { RegistrationSuccess } from "./registration-success";
import styles from "./auth.module.css";

export function BuyerRegisterContent() {
  const [createdUser, setCreatedUser] = useState<MockUser | null>(null);
  const session = useSession();

  if (createdUser) return <RegistrationSuccess user={createdUser} />;

  return (
    <>
      <Link href="/" className={styles.backLink}>
        ← Kembali ke beranda
      </Link>
      <div className={styles.heading}>
        <h1 id="auth-title" className={styles.title}>
          Buat akun
        </h1>
        <p className={styles.subtitle}>
          Sudah punya akun?{" "}
          <Link href="/masuk" className={styles.inlineLink}>
            Masuk
          </Link>
        </p>
      </div>
      <BuyerRegisterForm
        onRegistered={(user) => {
          // Akun baru langsung masuk, sesuai layar "Akun dibuat. Selamat datang".
          session.logIn(user);
          setCreatedUser(user);
        }}
      />
      <p className={styles.privacyNote}>
        Kata sandi disimpan dalam bentuk hash. Kami pun tidak bisa melihatnya.
      </p>
    </>
  );
}
