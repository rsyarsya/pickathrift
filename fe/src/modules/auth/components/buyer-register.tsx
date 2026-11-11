import Link from "next/link";
import { AuthShell } from "./auth-shell";
import { BuyerRegisterForm } from "./buyer-register-form";
import styles from "./auth.module.css";

export function BuyerRegister() {
  return (
    <AuthShell
      title="Buat akun"
      photoSrc="/images/auth/buyer-register.png"
      variant="register"
      subtitle={
        <>
          Sudah punya akun?{" "}
          <Link href="/masuk" className={styles.inlineLink}>
            Masuk
          </Link>
        </>
      }
      footer={
        <p className={styles.privacyNote}>
          Kata sandi disimpan dalam bentuk hash. Kami pun tidak bisa melihatnya.
        </p>
      }
    >
      <BuyerRegisterForm />
    </AuthShell>
  );
}
