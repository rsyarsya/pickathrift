import Image from "next/image";
import Link from "next/link";
import { DM_Mono, Instrument_Sans } from "next/font/google";
import { BuyerLoginForm } from "./buyer-login-form";
import styles from "./buyer-login.module.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-auth-sans",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-auth-mono",
});

export function BuyerLogin() {
  return (
    <main
      className={`${styles.page} ${instrumentSans.variable} ${dmMono.variable}`}
      aria-labelledby="buyer-login-title"
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
            src="/images/auth/buyer-login.png"
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

      <section className={styles.formArea} aria-labelledby="buyer-login-title">
        <div className={styles.formContent}>
          <Link href="/" className={styles.backLink}>
            ← Kembali ke beranda
          </Link>

          <div className={styles.heading}>
            <h1 id="buyer-login-title" className={styles.title}>
              Masuk
            </h1>
            <p className={styles.subtitle}>
              Belum punya akun?{" "}
              <span className={styles.inlineLink} aria-disabled="true">
                Daftar
              </span>
            </p>
          </div>

          <BuyerLoginForm />

          <span className={styles.adminLink} aria-disabled="true">
            Admin toko? Masuk lewat halaman admin →
          </span>
        </div>
      </section>
    </main>
  );
}
