"use client";

import { PasswordField } from "./password-field";
import styles from "./auth.module.css";

export function AdminLoginForm() {
  return (
    <form className={styles.form} onSubmit={(event) => event.preventDefault()}>
      <div className={styles.fields}>
        <div className={styles.field}>
          <label htmlFor="admin-email" className={styles.label}>
            Email admin
          </label>
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="admin@pickathrift.id"
            className={styles.input}
          />
        </div>

        <PasswordField
          id="admin-password"
          name="password"
          label="Kata sandi"
          placeholder="Kata sandi admin"
          autoComplete="current-password"
        />
      </div>

      {/* Submit diaktifkan saat validasi dan proses login ditambahkan. */}
      <button type="submit" className={styles.submitButton} disabled>
        Masuk ke dasbor
      </button>
    </form>
  );
}
