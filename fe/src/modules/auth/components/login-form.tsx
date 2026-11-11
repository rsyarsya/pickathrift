"use client";

import { useState, type FormEvent } from "react";
import { AUTH_SIMULATION_ENABLED } from "@/lib/env";
import { useAuthSimulation } from "../hooks/use-auth-simulation";
import { mockAuth, type MockRole } from "../lib/mock-auth";
import { validateBuyerLogin, type BuyerLoginValues } from "../lib/validate-buyer-login";
import { AuthFeedback } from "./auth-feedback";
import { PasswordField } from "./password-field";
import styles from "./auth.module.css";

export function LoginForm({ role }: { role: MockRole }) {
  const [values, setValues] = useState<BuyerLoginValues>({ email: "", password: "" });
  const [touched, setTouched] = useState({ email: false, password: false });
  const errors = validateBuyerLogin(values);
  const emailError = touched.email ? errors.email : undefined;
  const passwordError = touched.password ? errors.password : undefined;
  const { pending, feedback, submit, clearFeedback } = useAuthSimulation();
  const admin = role === "admin";
  const emailId = `${role}-email`;
  const passwordId = `${role}-password`;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ email: true, password: true });
    clearFeedback();
    if (Object.keys(errors).length) {
      event.currentTarget
        .querySelector<HTMLInputElement>(errors.email ? '[name="email"]' : '[name="password"]')
        ?.focus();
      return;
    }
    void submit(
      () => mockAuth.login(values, role),
      (user) => `Berhasil masuk sebagai ${admin ? "Admin" : "Buyer"}. Halo, ${user.name}!`,
    );
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
      <AuthFeedback feedback={feedback} />
      <fieldset className={styles.fields} disabled={pending}>
        <div className={styles.field}>
          <label htmlFor={emailId} className={styles.label}>
            {admin ? "Email admin" : "Email"}
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            placeholder={admin ? "admin@pickathrift.id" : "nama@email.com"}
            value={values.email}
            onChange={(event) => setValues({ ...values, email: event.target.value })}
            onBlur={() => setTouched((previous) => ({ ...previous, email: true }))}
            required
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? `${emailId}-error` : undefined}
            className={styles.input}
          />
          {emailError && (
            <p id={`${emailId}-error`} className={styles.errorText} aria-live="polite">
              {emailError}
            </p>
          )}
        </div>

        <PasswordField
          id={passwordId}
          name="password"
          label="Kata sandi"
          placeholder={admin ? "Kata sandi admin" : "Kata sandimu"}
          autoComplete="current-password"
          value={values.password}
          onChange={(event) => setValues({ ...values, password: event.target.value })}
          onBlur={() => setTouched((previous) => ({ ...previous, password: true }))}
          required
          error={passwordError}
        />
      </fieldset>

      <button
        type="submit"
        className={styles.submitButton}
        disabled={!AUTH_SIMULATION_ENABLED || pending}
      >
        {pending ? "Memproses…" : admin ? "Masuk ke dasbor" : "Masuk"}
      </button>
    </form>
  );
}
