"use client";

import { useState } from "react";
import styles from "./auth.module.css";

type PasswordFieldProps = {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  autoComplete: "current-password" | "new-password";
  hint?: string;
};

export function PasswordField({
  id,
  name,
  label,
  placeholder,
  autoComplete,
  hint,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.passwordBox}>
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-describedby={hintId}
          className={styles.passwordInput}
        />
        <button
          type="button"
          className={styles.passwordToggle}
          aria-label={`${visible ? "Sembunyikan" : "Tampilkan"} ${label.toLowerCase()}`}
          aria-controls={id}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? "SEMBUNYIKAN" : "TAMPILKAN"}
        </button>
      </div>
      {hint && (
        <p id={hintId} className={styles.helperText}>
          {hint}
        </p>
      )}
    </div>
  );
}
