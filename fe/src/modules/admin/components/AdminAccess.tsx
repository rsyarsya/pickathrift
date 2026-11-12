"use client";

import { useState, type FormEvent } from "react";
import { Logo } from "@/components/layout/Logo";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { AUTH_SIMULATION_ENABLED } from "@/lib/env";
import { cn } from "@/lib/cn";
import { MockAuthError, mockAuth } from "@/modules/auth/lib/mock-auth";
import { validateBuyerLogin } from "@/modules/auth/lib/validate-buyer-login";

/** Lencana kecil "ADMIN" di samping logo. */
export function AdminBadge({ tone = "peach" }: { tone?: "peach" | "dark" }) {
  return (
    <span
      className={cn(
        "rounded-full px-8 py-3 font-mono text-nano font-medium tracking-label",
        tone === "peach" ? "bg-peach text-fg" : "bg-night text-night-fg",
      )}
    >
      ADMIN
    </span>
  );
}

/** M4.1: yang masuk adalah Buyer, bukan admin. */
export function AccessDenied({
  buyerName,
  onSwitch,
}: {
  buyerName?: string;
  onSwitch: () => void;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-16 py-48">
      <div className="flex max-w-460 flex-col items-center gap-16 text-center">
        <Logo size={24} />
        <span className="flex size-48 items-center justify-center rounded-full bg-danger-bg text-danger">
          <Icon name="lock" size={20} />
        </span>
        <h1 className="text-title">Halaman ini khusus admin</h1>
        <p className="text-sm leading-relaxed text-muted">
          {buyerName
            ? `Kamu masuk sebagai ${buyerName} (Buyer). `
            : "Kamu belum masuk sebagai admin. "}
          Kalau kamu pengelola toko, keluar lalu masuk dengan akun admin.
        </p>
        <div className="flex flex-wrap justify-center gap-10">
          <ButtonLink href="/" size="sm">
            Kembali ke toko
          </ButtonLink>
          <Button variant="outline" size="sm" onClick={onSwitch}>
            {buyerName ? "Keluar dan masuk admin" : "Masuk admin"}
          </Button>
        </div>
        <p className="font-mono text-nano tracking-label text-muted">KODE · 403 BUKAN ADMIN</p>
      </div>
    </main>
  );
}

/** M4.2: sesi admin kedaluwarsa. Masuk lagi langsung dari sini tanpa kehilangan halaman. */
export function SessionExpired({
  email,
  onLoggedIn,
}: {
  email: string;
  onLoggedIn: (user: { name: string; email: string }) => void;
}) {
  const [values, setValues] = useState({ email, password: "" });
  const [errors, setErrors] = useState<Partial<Record<"email" | "password", string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateBuyerLogin(values);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length) return;
    setPending(true);
    try {
      onLoggedIn(await mockAuth.login(values, "admin"));
    } catch (error) {
      setFailure(error instanceof MockAuthError ? error.message : "Gagal masuk. Coba lagi.");
      setPending(false);
    }
  }

  const input = (invalid: boolean) =>
    cn(
      "w-full rounded-md border bg-surface px-14 py-12 text-sm outline-none focus:border-fg",
      invalid ? "border-[1.5px] border-danger" : "border-line",
    );

  return (
    <main className="grid min-h-dvh place-items-center bg-night px-16 py-48">
      <form
        noValidate
        onSubmit={submit}
        aria-labelledby="expired-title"
        className="flex w-full max-w-460 flex-col gap-16 rounded-xl bg-canvas p-24 md:p-28"
      >
        <div className="flex items-center gap-8">
          <Logo size={22} />
          <AdminBadge tone="dark" />
        </div>
        <h1 id="expired-title" className="text-title">
          Sesi berakhir
        </h1>
        <p className="rounded-md bg-warning-bg px-14 py-12 text-caption leading-relaxed">
          Demi keamanan, sesi admin berakhir setelah lama tidak aktif. Masuk lagi untuk melanjutkan.
        </p>
        {failure && (
          <p role="alert" className="rounded-md bg-danger-bg px-14 py-12 text-caption">
            {failure}
          </p>
        )}
        <div className="flex flex-col gap-6">
          <label htmlFor="expired-email" className="text-caption font-medium">
            Email admin
          </label>
          <input
            id="expired-email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "expired-email-error" : undefined}
            className={input(!!errors.email)}
          />
          {errors.email && (
            <p id="expired-email-error" className="text-caption text-danger">
              {errors.email}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-6">
          <label htmlFor="expired-password" className="text-caption font-medium">
            Kata sandi
          </label>
          <div className="relative">
            <input
              id="expired-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Kata sandi admin"
              value={values.password}
              onChange={(e) => setValues({ ...values, password: e.target.value })}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "expired-password-error" : undefined}
              className={cn(input(!!errors.password), "pr-96")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute top-1/2 right-12 -translate-y-1/2 font-mono text-nano tracking-label"
            >
              {showPassword ? "SEMBUNYIKAN" : "TAMPILKAN"}
            </button>
          </div>
          {errors.password && (
            <p id="expired-password-error" className="text-caption text-danger">
              {errors.password}
            </p>
          )}
        </div>
        <Button type="submit" size="md" disabled={!AUTH_SIMULATION_ENABLED || pending}>
          {pending ? "Memproses…" : "Masuk lagi"}
        </Button>
        <p className="font-mono text-nano tracking-label text-muted">KODE · 401 SESI KEDALUWARSA</p>
      </form>
    </main>
  );
}
