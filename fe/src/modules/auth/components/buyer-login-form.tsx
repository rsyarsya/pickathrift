"use client";

import { PasswordField } from "./password-field";
import styles from "./auth.module.css";

export function BuyerLoginForm() {
  return (
    <form className={styles.form} onSubmit={(event) => event.preventDefault()}>
      <div className={styles.fields}>
        <div className={styles.field}>
          <label htmlFor="buyer-email" className={styles.label}>
            Email
          </label>
          <input
            id="buyer-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            className={styles.input}
          />
        </div>

        <PasswordField
          id="buyer-password"
          name="password"
          label="Kata sandi"
          placeholder="Kata sandimu"
          autoComplete="current-password"
        />
      </div>

      {/* Submit diaktifkan saat validasi dan proses login ditambahkan. */}
      <button type="submit" className={styles.submitButton} disabled>
        Masuk
      </button>
    </form>
  );
}
