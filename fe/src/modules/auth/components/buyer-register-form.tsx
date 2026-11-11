"use client";

import { useState, type FormEvent } from "react";
import { AUTH_SIMULATION_ENABLED } from "@/lib/env";
import { useAuthSimulation } from "../hooks/use-auth-simulation";
import { mockAuth, type MockUser } from "../lib/mock-auth";
import { validateRegistration, type RegistrationValues } from "../lib/validate-registration";
import { AuthFeedback } from "./auth-feedback";
import { PasswordField } from "./password-field";
import styles from "./auth.module.css";

export function BuyerRegisterForm({ onRegistered }: { onRegistered: (user: MockUser) => void }) {
  const [values, setValues] = useState<RegistrationValues>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const { pending, feedback, submit, clearFeedback } = useAuthSimulation();
  const errors = validateRegistration(values);
  const errorFor = (field: keyof RegistrationValues) =>
    touched[field] ? errors[field] : undefined;
  const touch = (field: keyof RegistrationValues) =>
    setTouched((previous) => ({ ...previous, [field]: true }));
  const change = (field: keyof RegistrationValues, value: string) =>
    setValues((previous) => ({ ...previous, [field]: value }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ name: true, email: true, password: true, confirmPassword: true });
    clearFeedback();
    const firstError = (Object.keys(values) as (keyof RegistrationValues)[]).find(
      (field) => errors[field],
    );
    if (firstError) {
      event.currentTarget.querySelector<HTMLInputElement>(`[name="${firstError}"]`)?.focus();
      return;
    }
    void submit(
      () => mockAuth.register(values),
      (user) => `Akun uji berhasil dibuat. Selamat datang, ${user.name}!`,
    ).then((user) => {
      if (user) onRegistered(user);
    });
  }

  return (
    <form
      method="post"
      className={styles.form}
      noValidate
      onSubmit={handleSubmit}
      onChange={clearFeedback}
      aria-busy={pending}
    >
      <AuthFeedback feedback={feedback?.kind === "error" ? feedback : null} />
      <fieldset className={styles.fields} disabled={pending}>
        <div className={styles.field}>
          <label htmlFor="register-name" className={styles.label}>
            Nama lengkap
          </label>
          <input
            id="register-name"
            name="name"
            autoComplete="name"
            placeholder="Nama untuk alamat pengiriman"
            value={values.name}
            onChange={(event) => change("name", event.target.value)}
            onBlur={() => touch("name")}
            required
            aria-invalid={errorFor("name") ? true : undefined}
            aria-describedby={errorFor("name") ? "register-name-error" : undefined}
            className={styles.input}
          />
          {errorFor("name") && (
            <p id="register-name-error" className={styles.errorText} aria-live="polite">
              {errorFor("name")}
            </p>
          )}
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
            value={values.email}
            onChange={(event) => change("email", event.target.value)}
            onBlur={() => touch("email")}
            required
            aria-invalid={errorFor("email") ? true : undefined}
            aria-describedby={errorFor("email") ? "register-email-error" : undefined}
            className={styles.input}
          />
          {errorFor("email") && (
            <p id="register-email-error" className={styles.errorText} aria-live="polite">
              {errorFor("email")}
            </p>
          )}
        </div>

        <PasswordField
          id="register-password"
          name="password"
          label="Kata sandi"
          placeholder="Minimal 8 karakter"
          autoComplete="new-password"
          hint="Minimal 8 karakter."
          value={values.password}
          onChange={(event) => change("password", event.target.value)}
          onBlur={() => touch("password")}
          required
          error={errorFor("password")}
        />
        <PasswordField
          id="register-confirm-password"
          name="confirmPassword"
          label="Ulangi kata sandi"
          placeholder="Ketik ulang"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={(event) => change("confirmPassword", event.target.value)}
          onBlur={() => touch("confirmPassword")}
          required
          error={errorFor("confirmPassword")}
        />
      </fieldset>

      <button
        type="submit"
        className={styles.submitButton}
        disabled={!AUTH_SIMULATION_ENABLED || pending}
      >
        {pending ? "Memproses…" : "Buat akun"}
      </button>
    </form>
  );
}
