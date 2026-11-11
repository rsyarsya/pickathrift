import Link from "next/link";
import { AuthShell } from "./auth-shell";
import { BuyerLoginForm } from "./buyer-login-form";
import styles from "./auth.module.css";

export function BuyerLogin() {
  return (
    <AuthShell photoSrc="/images/auth/buyer-login.png">
      <Link href="/" className={styles.backLink}>
        ← Kembali ke beranda
      </Link>
      <div className={styles.heading}>
        <h1 id="auth-title" className={styles.title}>
          Masuk
        </h1>
        <p className={styles.subtitle}>
          Belum punya akun?{" "}
          <Link href="/daftar" className={styles.inlineLink}>
            Daftar
          </Link>
        </p>
      </div>
      <BuyerLoginForm />
      <Link href="/admin/masuk" className={styles.adminLink}>
        Admin toko? Masuk lewat halaman admin →
      </Link>
    </AuthShell>
  );
}
