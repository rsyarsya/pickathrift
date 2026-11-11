import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { authFontClassName } from "./auth-fonts";
import styles from "./auth.module.css";

type AuthShellProps = {
  photoSrc: string;
  variant?: "register";
  children: ReactNode;
};

export function AuthShell({ photoSrc, variant, children }: AuthShellProps) {
  return (
    <main
      className={`${styles.page} ${authFontClassName} ${variant === "register" ? styles.registerPage : ""}`}
      aria-labelledby="auth-title"
    >
      <header className={styles.compactHeader}>
        <Link href="/" className={styles.compactBackLink} aria-label="Kembali ke beranda">
          <Image src="/images/auth/back-arrow.svg" alt="" width={22} height={22} />
        </Link>
        <Image
          src="/images/auth/pickathrift-logo.png"
          alt="PickaThrift"
          width={2172}
          height={724}
          loading="eager"
          sizes="156px"
          className={styles.headerLogo}
        />
      </header>

      <div className={styles.photoWrap}>
        <div className={styles.photoPanel}>
          <Image
            src={photoSrc}
            alt=""
            fill
            preload
            sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 64px), 44.45vw"
            className={styles.photo}
          />
          <Image
            src="/images/auth/pickathrift-logo.png"
            alt="PickaThrift"
            width={2172}
            height={724}
            loading="eager"
            sizes="180px"
            className={styles.logo}
          />
          <p className={styles.caption}>SATU TOKO · SATU UNIT PER BARANG</p>
        </div>
      </div>

      <section className={styles.formArea} aria-labelledby="auth-title">
        <div className={styles.formContent}>{children}</div>
      </section>
    </main>
  );
}
