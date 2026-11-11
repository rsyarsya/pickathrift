"use client";

import { useState } from "react";
import styles from "./buyer-login.module.css";

export function BuyerLoginForm() {
  const [passwordVisible, setPasswordVisible] = useState(false);

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

        <div className={styles.field}>
          <label htmlFor="buyer-password" className={styles.label}>
            Kata sandi
          </label>
          <div className={styles.passwordBox}>
            <input
              id="buyer-password"
              name="password"
              type={passwordVisible ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Kata sandimu"
              className={styles.passwordInput}
            />
            <button
              type="button"
              className={styles.passwordToggle}
              aria-controls="buyer-password"
              aria-pressed={passwordVisible}
              onClick={() => setPasswordVisible((visible) => !visible)}
            >
              {passwordVisible ? "SEMBUNYIKAN" : "TAMPILKAN"}
            </button>
          </div>
        </div>
      </div>

      {/* Submit diaktifkan saat validasi dan proses login ditambahkan. */}
      <button type="submit" className={styles.submitButton} disabled>
        Masuk
      </button>
    </form>
  );
}
