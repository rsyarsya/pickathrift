"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/cn";
import { CATEGORIES, STYLES } from "@/modules/catalog/types";
import {
  BODY_FIELDS,
  LABEL_SIZES,
  criteriaToParams,
  formFromParams,
  validate,
  type CriteriaErrors,
  type CriteriaForm,
} from "@/modules/match/criteria";
import { MeasuringGuide } from "@/modules/match/components/MeasuringGuide";

const step = "font-mono text-micro tracking-label text-muted";
const fieldLabel = "text-sm font-medium";
const errorText = "text-caption text-danger";

function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: readonly T[];
  value?: T;
  onChange: (value?: T) => void;
  error?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-10" aria-invalid={!!error}>
      <legend className={cn(fieldLabel, "mb-10")}>{label}</legend>
      <div className="flex flex-wrap gap-6">
        {options.map((option) => (
          <Chip
            key={option}
            size="lg"
            active={value === option}
            invalid={!!error}
            // Tekan lagi untuk melepas pilihan.
            onClick={() => onChange(value === option ? undefined : option)}
          >
            {option}
          </Chip>
        ))}
      </div>
      {error && (
        <p role="alert" className={errorText}>
          {error}
        </p>
      )}
    </fieldset>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  suffix,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder: string;
  suffix?: ReactNode;
  inputMode: "numeric" | "decimal";
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8">
      <label htmlFor={id} className={fieldLabel}>
        {label}
      </label>
      <div
        className={cn(
          "flex items-center gap-8 rounded-md border px-16 py-14 focus-within:border-fg",
          error ? "border-[1.5px] border-danger bg-[#fff8f6]" : "border-line bg-surface",
        )}
      >
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode={inputMode}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="w-full min-w-0 bg-transparent text-base outline-none placeholder:text-disabled-fg"
        />
        {suffix && (
          <span className="font-mono text-micro font-medium tracking-label">{suffix}</span>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className={errorText}>
          {error}
        </p>
      )}
    </div>
  );
}

/** B4.1–B4.3: form kriteria. Isian awal diambil dari URL supaya "Ubah kriteria" tidak mengosongkan form. */
export function MatchForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [form, setForm] = useState<CriteriaForm>(() => formFromParams(new URLSearchParams(params)));
  const [errors, setErrors] = useState<CriteriaErrors>({});
  const guide = useRef<HTMLDialogElement>(null);

  function set<K extends keyof CriteriaForm>(key: K, value: CriteriaForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const result = validate(form);
    if (!result.ok) {
      setErrors(result.errors);
      // Bawa pengguna ke galat pertama.
      requestAnimationFrame(() =>
        formEl.querySelector<HTMLElement>("[aria-invalid=true]")?.scrollIntoView({
          block: "center",
          behavior: "smooth",
        }),
      );
      return;
    }
    setErrors({});
    const next = criteriaToParams(result.criteria);
    next.set("cari", "1");
    router.push(`/cari-yang-cocok?${next}`);
  }

  return (
    <div className="flex flex-col gap-20 px-16 pt-24 pb-64 md:px-24 lg:px-48 lg:pt-32 lg:pb-96">
      <PageHeader overline="FITUR UNGGULAN" title="Cari yang Cocok" />

      <button
        type="button"
        onClick={() => guide.current?.showModal()}
        className="flex items-center justify-between rounded-md bg-mint px-16 py-12 text-sm lg:hidden"
      >
        Belum tahu cara mengukur?
        <span className="font-medium underline">Lihat caranya →</span>
      </button>

      <div className="flex gap-56">
        <form
          noValidate
          onSubmit={submit}
          className="flex w-full flex-col gap-18 lg:w-720 lg:shrink-0"
        >
          <p className={step}>LANGKAH 1 · YANG KAMU CARI</p>
          <ChoiceGroup
            label="Jenis pakaian"
            options={CATEGORIES}
            value={form.category}
            onChange={(v) => {
              set("category", v);
              setErrors((e) => ({ ...e, category: undefined }));
            }}
            error={errors.category}
          />
          <ChoiceGroup
            label="Gaya"
            options={STYLES}
            value={form.style}
            onChange={(v) => set("style", v)}
          />
          <ChoiceGroup
            label="Ukuran label"
            options={LABEL_SIZES}
            value={form.size}
            onChange={(v) => set("size", v)}
          />
          <div className="flex gap-12">
            <Field
              id="budget-min"
              label="Budget minimum"
              placeholder="Rp 0"
              inputMode="numeric"
              value={form.min}
              onChange={(v) => set("min", v)}
              error={errors.min}
            />
            <Field
              id="budget-max"
              label="Budget maksimum"
              placeholder="Rp 250.000"
              inputMode="numeric"
              value={form.max}
              onChange={(v) => set("max", v)}
              error={errors.max}
            />
          </div>

          <p className={step}>LANGKAH 2 · UKURAN PAKAIANMU (OPSIONAL)</p>
          <p className="text-sm leading-[1.45] text-muted">
            Ukur atasan yang sudah pas di badanmu, dalam posisi terbentang datar. Bukan ukuran
            tubuh.
          </p>
          <div className="flex gap-8 md:gap-12">
            {BODY_FIELDS.map((f) => (
              <Field
                key={f.key}
                id={`ukuran-${f.key}`}
                label={f.label}
                placeholder="—"
                inputMode="decimal"
                suffix="CM"
                value={form.body[f.key]}
                onChange={(v) => set("body", { ...form.body, [f.key]: v })}
                error={errors[f.key]}
              />
            ))}
          </div>

          <Button type="submit" className="max-md:w-full md:self-start md:py-15 md:text-[15px]">
            Cari yang sesuai →
          </Button>
        </form>

        <aside className="hidden flex-1 self-start lg:block">
          <MeasuringGuide />
        </aside>
      </div>

      <dialog
        ref={guide}
        aria-label="Cara mengukur"
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="m-auto w-[calc(100%-32px)] max-w-460 rounded-xl bg-transparent p-0"
      >
        <form method="dialog" className="absolute top-12 right-12">
          <button aria-label="Tutup" className="flex rounded-full bg-surface p-6">
            <Icon name="close" size={18} />
          </button>
        </form>
        <MeasuringGuide />
      </dialog>
    </div>
  );
}
