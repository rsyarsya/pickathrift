"use client";

import { useState, type ComponentProps, type FocusEventHandler } from "react";
import styles from "./auth.module.css";

type PasswordFieldProps = {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  autoComplete: "current-password" | "new-password";
  hint?: string;
  error?: string;
  onBlur?: FocusEventHandler<HTMLDivElement>;
} & Pick<ComponentProps<"input">, "value" | "onChange" | "required">;

export function PasswordField({
  id,
  name,
  label,
  placeholder,
  autoComplete,
  hint,
  error,
  value,
  onChange,
  onBlur,
  required,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const message = error || hint;
  const messageId = message ? `${id}-${error ? "error" : "hint"}` : undefined;

  return (
    <div
      className={styles.field}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onBlur?.(event);
      }}
    >
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
          value={value}
          onChange={onChange}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
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
      {message && (
        <p
          id={messageId}
          className={error ? styles.errorText : styles.helperText}
          aria-live="polite"
        >
          {message}
        </p>
      )}
    </div>
  );
}
