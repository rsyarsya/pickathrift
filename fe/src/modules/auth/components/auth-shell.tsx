import Image from "next/image";
import Link from "next/link";
import { DM_Mono, Instrument_Sans } from "next/font/google";
import type { ReactNode } from "react";
import styles from "./auth.module.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-auth-sans",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-auth-mono",
});

type AuthShellProps = {
  title: string;
  subtitle: ReactNode;
  photoSrc: string;
  variant?: "register";
  children: ReactNode;
  footer: ReactNode;
};

export function AuthShell({
  title,
  subtitle,
  photoSrc,
  variant,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main
      className={`${styles.page} ${instrumentSans.variable} ${dmMono.variable} ${variant === "register" ? styles.registerPage : ""}`}
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
        <div className={styles.formContent}>
          <Link href="/" className={styles.backLink}>
            ← Kembali ke beranda
          </Link>

          <div className={styles.heading}>
            <h1 id="auth-title" className={styles.title}>
              {title}
            </h1>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>

          {children}
          {footer}
        </div>
      </section>
    </main>
  );
}
