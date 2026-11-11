import Link from "next/link";
import { AuthShell } from "./auth-shell";
import { BuyerLoginForm } from "./buyer-login-form";
import styles from "./auth.module.css";

export function BuyerLogin() {
  return (
    <AuthShell
      title="Masuk"
      photoSrc="/images/auth/buyer-login.png"
      subtitle={
        <>
          Belum punya akun?{" "}
          <Link href="/daftar" className={styles.inlineLink}>
            Daftar
          </Link>
        </>
      }
      footer={
        <span className={styles.adminLink} aria-disabled="true">
          Admin toko? Masuk lewat halaman admin →
        </span>
      }
    >
      <BuyerLoginForm />
    </AuthShell>
  );
}
