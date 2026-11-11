"use client";

import { PasswordField } from "./password-field";
import styles from "./auth.module.css";

export function BuyerRegisterForm() {
  return (
    <form className={styles.form} onSubmit={(event) => event.preventDefault()}>
      <div className={styles.fields}>
        <div className={styles.field}>
          <label htmlFor="register-name" className={styles.label}>
            Nama lengkap
          </label>
          <input
            id="register-name"
            name="name"
            autoComplete="name"
            placeholder="Nama untuk alamat pengiriman"
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="register-email" className={styles.label}>
            Email
          </label>
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            className={styles.input}
          />
        </div>

        <PasswordField
          id="register-password"
          name="password"
          label="Kata sandi"
          placeholder="Minimal 8 karakter"
          autoComplete="new-password"
          hint="Minimal 8 karakter."
        />
        <PasswordField
          id="register-confirm-password"
          name="confirmPassword"
          label="Ulangi kata sandi"
          placeholder="Ketik ulang"
          autoComplete="new-password"
        />
      </div>

      {/* Submit diaktifkan saat validasi dan proses registrasi ditambahkan. */}
      <button type="submit" className={styles.submitButton} disabled>
        Buat akun
      </button>
    </form>
  );
}
