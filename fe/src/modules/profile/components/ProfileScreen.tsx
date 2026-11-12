"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { shopContent } from "@/components/layout/shopContent";
import { Button } from "@/components/ui/Button";
import { PageHeader, asideLink } from "@/components/ui/PageHeader";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { Toast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { useToast } from "@/hooks/useToast";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { BuyerOnly } from "@/modules/auth/components/BuyerOnly";
import { useSession, type SessionUser } from "@/modules/auth/useSession";
import { validateProfile, type ShippingAddress } from "../address";
import { getProfile, saveProfile } from "../data/profile";

const fields = [
  { key: "recipient", label: "Nama lengkap", autoComplete: "name", className: "max-md:col-span-2" },
  {
    key: "email",
    label: "Email · tidak bisa diubah",
    autoComplete: "email",
    className: "max-md:col-span-2",
  },
  { key: "phone", label: "Nomor HP", autoComplete: "tel", className: "col-span-2" },
  {
    key: "street",
    label: "Alamat lengkap",
    autoComplete: "street-address",
    className: "col-span-2",
  },
  { key: "city", label: "Kota", autoComplete: "address-level2", className: "" },
  { key: "postalCode", label: "Kode pos", autoComplete: "postal-code", className: "" },
] as const;

const links = [
  { href: "/pesanan", label: "Pesanan saya" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/ulasan?milik=saya", label: "Ulasan saya" },
];

function AccountNav({ name, onLogout }: { name: string; onLogout: () => void }) {
  return (
    <aside className="hidden min-w-0 content-start gap-16 lg:grid">
      <div className="flex min-w-0 items-center gap-12">
        <span
          aria-hidden
          className="grid size-44 shrink-0 place-items-center rounded-full bg-peach text-card"
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-body font-medium wrap-anywhere">{name}</p>
          <p className="font-mono text-micro tracking-label text-muted">BUYER</p>
        </div>
      </div>
      <nav aria-label="Akun Buyer" className="grid gap-4 text-body">
        <Link
          href="/profil"
          aria-current="page"
          className="rounded-sm bg-surface px-14 py-8 font-medium"
        >
          Akun &amp; alamat
        </Link>
        {links.map(({ href, label }) => (
          <Link key={href} href={href} className="rounded-sm px-14 py-8 hover:bg-surface">
            {label}
          </Link>
        ))}
        <button
          type="button"
          className={cn(asideLink, "justify-self-start text-danger")}
          onClick={onLogout}
        >
          Keluar akun
        </button>
      </nav>
    </aside>
  );
}

function ProfileEditor({
  initial,
  user,
  demo,
  onLogout,
}: {
  initial: ShippingAddress;
  user: SessionUser;
  demo: string | null;
  onLogout: () => void;
}) {
  const [saved, setSaved] = useState(initial);
  const [values, setValues] = useState(initial);
  const [showErrors, setShowErrors] = useState(demo === "validasi");
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { toast, show, clear } = useToast();
  const session = useSession();
  const errors = showErrors ? validateProfile(values) : {};
  const dirty = fields.some(({ key }) => key !== "email" && values[key] !== saved[key]);
  const canSave = dirty || (demo === "validasi" && Object.keys(errors).length > 0);

  useEffect(() => {
    if (demo === "tersimpan") show("✓ Perubahan disimpan");
  }, [demo, show]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !canSave) return;
    setSaveError(null);
    setShowErrors(true);
    const invalid = validateProfile(values);
    const firstInvalid = fields.find(({ key }) => key !== "email" && invalid[key]);
    if (firstInvalid) {
      event.currentTarget.querySelector<HTMLElement>(`#profile-${firstInvalid.key}`)?.focus();
      return;
    }
    setPending(true);
    try {
      const result = await saveProfile(user.email, values, demo);
      setSaved(result.address);
      setValues(result.address);
      setShowErrors(false);
      if (result.persisted) session.updateName(user.email, result.address.recipient);
      show("✓ Perubahan disimpan");
    } catch (error) {
      setSaveError(
        error instanceof ApiError ? error.message : "Perubahan gagal disimpan. Coba lagi.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className={cn(
        shopContent,
        "grid items-start gap-32 lg:grid-cols-[240px_minmax(0,720px)] lg:gap-56",
      )}
    >
      <AccountNav name={saved.recipient || user.name} onLogout={onLogout} />
      <div className="grid min-w-0 gap-16">
        <PageHeader title="Akun & alamat" overline="Akun" />
        {Object.keys(errors).length > 0 && (
          <p role="alert" className="rounded-md bg-danger-bg p-14 text-body">
            Periksa kolom yang ditandai merah.
          </p>
        )}
        <form onSubmit={(event) => void submit(event)} noValidate aria-busy={pending}>
          <fieldset disabled={pending} className="grid min-w-0 grid-cols-2 gap-14">
            <legend className="sr-only">Data diri dan alamat pengiriman</legend>
            {fields.map(({ key, label, autoComplete, className }) => {
              const id = `profile-${key}`;
              const error = key === "email" ? undefined : errors[key];
              const hint =
                error || (key === "phone" ? "Dipakai kurir untuk menghubungimu." : undefined);
              const props = {
                id,
                name: key,
                value: key === "email" ? user.email : values[key],
                readOnly: key === "email",
                required: key !== "email",
                autoComplete,
                "aria-invalid": error ? true : undefined,
                "aria-describedby": hint ? `${id}-hint` : undefined,
                onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                  if (key !== "email") {
                    setValues({ ...values, [key]: event.target.value });
                    setSaveError(null);
                  }
                },
                className: cn(
                  "min-h-48 w-full min-w-0 rounded-md border px-16 py-12 text-body",
                  error ? "border-danger bg-danger-bg" : "border-line bg-surface",
                  key === "email" && "bg-subtle text-muted",
                ),
              };
              return (
                <div key={key} className={cn("grid min-w-0 content-start gap-6", className)}>
                  <label htmlFor={id} className="text-body font-medium">
                    {label}
                  </label>
                  {key === "street" ? (
                    <textarea
                      {...props}
                      rows={1}
                      className={cn(props.className, "resize-y [field-sizing:content]")}
                    />
                  ) : (
                    <input
                      {...props}
                      type={key === "phone" ? "tel" : key === "email" ? "email" : "text"}
                      inputMode={key === "postalCode" ? "numeric" : undefined}
                    />
                  )}
                  {hint && (
                    <p
                      id={`${id}-hint`}
                      className={cn("text-caption", error ? "text-danger" : "text-muted")}
                    >
                      {hint}
                    </p>
                  )}
                </div>
              );
            })}
          </fieldset>
          {saveError && (
            <p role="alert" className="mt-14 text-caption text-danger">
              {saveError}
            </p>
          )}
          <Button type="submit" disabled={!canSave || pending} className="mt-16 w-full md:w-auto">
            {pending ? "Menyimpan…" : "Simpan perubahan"}
          </Button>
        </form>
        <button
          type="button"
          className={cn(asideLink, "justify-self-start text-danger lg:hidden")}
          onClick={onLogout}
        >
          Keluar akun
        </button>
      </div>
      <Toast toast={toast} onDone={clear} />
    </div>
  );
}

function ProfileLoader({
  user,
  demo,
  onLogout,
}: {
  user: SessionUser;
  demo: string | null;
  onLogout: () => void;
}) {
  const result = useAsync(() => getProfile(user, demo), [user.email, demo]);
  if (result.status === "loading")
    return (
      <p className={shopContent} role="status">
        Memuat profil…
      </p>
    );
  if (result.status === "error")
    return (
      <div className={shopContent}>
        <PageHeader title="Akun & alamat" overline="Akun" />
        <StatusMessage
          tone="error"
          title="Profil gagal dimuat"
          description={result.error.message}
          actions={<Button onClick={result.reload}>Coba lagi</Button>}
        />
      </div>
    );
  return <ProfileEditor initial={result.data} user={user} demo={demo} onLogout={onLogout} />;
}

export function ProfileScreen() {
  const demo = useSearchParams().get("demo");
  return (
    <BuyerOnly>
      {(user, logout) => (
        <ProfileLoader key={`${user.email}:${demo}`} user={user} demo={demo} onLogout={logout} />
      )}
    </BuyerOnly>
  );
}
