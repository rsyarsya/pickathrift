import Image from "next/image";
import Link from "next/link";
import { AdminLoginForm } from "./admin-login-form";
import { authFontClassName } from "./auth-fonts";
import styles from "./auth.module.css";

export function AdminLogin() {
  return (
    <main className={`${styles.adminPage} ${authFontClassName}`} aria-labelledby="admin-title">
      <section className={styles.adminCard} aria-labelledby="admin-title">
        <div className={styles.adminBrand}>
          <Image
            src="/images/auth/pickathrift-logo.png"
            alt="PickaThrift"
            width={2172}
            height={724}
            loading="eager"
            sizes="136px"
            className={styles.adminLogo}
          />
          <span className={styles.adminBadge}>ADMIN</span>
        </div>

        <div className={styles.heading}>
          <h1 id="admin-title" className={styles.title}>
            Masuk admin
          </h1>
          <p className={styles.subtitle}>Khusus pemilik dan staf toko.</p>
        </div>

        <AdminLoginForm />

        <Link href="/" className={styles.adminReturnLink}>
          Bukan admin? ← Kembali ke toko
        </Link>
      </section>
    </main>
  );
}
