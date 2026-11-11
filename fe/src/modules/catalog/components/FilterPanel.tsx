"use client";

import { useState, type ReactNode } from "react";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";
import { formatRupiah, parseRupiah } from "@/lib/format";
import {
  CATEGORIES,
  CONDITIONS,
  SIZES,
  type CatalogPage,
  type CatalogQuery,
} from "@/modules/catalog/types";

type FilterPanelProps = {
  query: CatalogQuery;
  counts?: CatalogPage["counts"];
  update: (patch: Partial<CatalogQuery>) => void;
  /** sidebar = desktop (B1.1). sheet = lembar bawah ponsel dan tablet (B1.6). */
  variant: "sidebar" | "sheet";
};

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

const overline = "font-mono text-micro tracking-label text-muted";

function Section({
  title,
  variant,
  children,
}: {
  title: string;
  variant: FilterPanelProps["variant"];
  children: ReactNode;
}) {
  return (
    <fieldset
      className={cn("flex flex-col gap-12", variant === "sidebar" && "border-b border-line pb-22")}
    >
      <legend className={cn(overline, "mb-12")}>{title}</legend>
      {children}
    </fieldset>
  );
}

function PriceRange({ query, update }: Pick<FilterPanelProps, "query" | "update">) {
  const [error, setError] = useState<string | null>(null);

  function commit(form: HTMLFormElement) {
    const data = new FormData(form);
    const min = parseRupiah(String(data.get("min") ?? ""));
    const max = parseRupiah(String(data.get("max") ?? ""));
    if (min !== null && max !== null && min > max) {
      setError("Harga minimum tidak boleh melebihi maksimum.");
      return;
    }
    setError(null);
    if (min !== (query.minPrice ?? null) || max !== (query.maxPrice ?? null)) {
      update({ minPrice: min ?? undefined, maxPrice: max ?? undefined });
    }
  }

  const input =
    "w-full min-w-0 rounded-sm border border-line bg-surface px-12 py-9 font-mono text-xs outline-none placeholder:text-fg focus:border-fg aria-invalid:border-danger";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        commit(e.currentTarget);
      }}
      onBlur={(e) => commit(e.currentTarget)}
      className="flex flex-col gap-8"
      noValidate
    >
      <div className="flex gap-8">
        <input
          // Remount saat filter direset dari luar, supaya isi kotak ikut kosong.
          key={`min-${query.minPrice}`}
          name="min"
          inputMode="numeric"
          aria-label="Harga minimum"
          placeholder="Rp 0"
          defaultValue={query.minPrice !== undefined ? formatRupiah(query.minPrice) : ""}
          aria-invalid={!!error}
          className={input}
        />
        <input
          key={`max-${query.maxPrice}`}
          name="max"
          inputMode="numeric"
          aria-label="Harga maksimum"
          placeholder="Rp 250.000"
          defaultValue={query.maxPrice !== undefined ? formatRupiah(query.maxPrice) : ""}
          aria-invalid={!!error}
          className={input}
        />
      </div>
      {error && (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      )}
      {/* Enter di salah satu kotak mengirim form ini. */}
      <button type="submit" hidden />
    </form>
  );
}

function AvailableSwitch({ query, update }: Pick<FilterPanelProps, "query" | "update">) {
  const on = query.availableOnly;
  return (
    <label className="flex items-center justify-between gap-12 text-sm font-medium">
      Hanya yang tersedia
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => update({ availableOnly: !on })}
        className={cn(
          "relative h-22 w-38 shrink-0 rounded-full transition-colors",
          on ? "bg-success" : "bg-[#c9c6be]",
        )}
      >
        <span
          className={cn(
            "absolute top-3 left-3 size-16 rounded-full bg-canvas transition-transform",
            on && "translate-x-16",
          )}
        />
      </button>
    </label>
  );
}

export function FilterPanel({ query, counts, update, variant }: FilterPanelProps) {
  const sheet = variant === "sheet";

  return (
    <div className={cn("flex flex-col", sheet ? "gap-20" : "gap-24")}>
      <Section title="KATEGORI" variant={variant}>
        {sheet ? (
          <div className="flex flex-wrap gap-8">
            {(["Semua", ...CATEGORIES] as const).map((c) => (
              <Chip
                key={c}
                size="lg"
                active={(query.category ?? "Semua") === c}
                onClick={() => update({ category: c === "Semua" ? undefined : c })}
              >
                {c}
              </Chip>
            ))}
          </div>
        ) : (
          <ul className="flex flex-col gap-12">
            {(["Semua", ...CATEGORIES] as const).map((c) => {
              const active = (query.category ?? "Semua") === c;
              return (
                <li key={c}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => update({ category: c === "Semua" ? undefined : c })}
                    className="flex w-full items-baseline justify-between text-body hover:underline"
                  >
                    <span className={cn(active && "font-medium underline")}>{c}</span>
                    <span className="font-mono text-xs text-muted">{counts?.[c] ?? ""}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="UKURAN" variant={variant}>
        <div className="flex flex-wrap gap-6">
          {SIZES.map((s) => (
            <Chip
              key={s}
              size={sheet ? "lg" : "sm"}
              active={query.sizes.includes(s)}
              onClick={() => update({ sizes: toggle(query.sizes, s) })}
            >
              {s}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="KONDISI" variant={variant}>
        {sheet ? (
          <div className="flex flex-wrap gap-8">
            {CONDITIONS.map((c) => (
              <Chip
                key={c}
                size="lg"
                active={query.conditions.includes(c)}
                onClick={() => update({ conditions: toggle(query.conditions, c) })}
              >
                {c}
              </Chip>
            ))}
          </div>
        ) : (
          CONDITIONS.map((c) => (
            <label key={c} className="flex items-center gap-10 text-sm">
              <input
                type="checkbox"
                checked={query.conditions.includes(c)}
                onChange={() => update({ conditions: toggle(query.conditions, c) })}
                className="size-16 appearance-none rounded-[4px] border-[1.5px] border-line-strong bg-surface checked:border-fg checked:bg-fg"
              />
              {c}
            </label>
          ))
        )}
      </Section>

      <Section title="HARGA" variant={variant}>
        <PriceRange query={query} update={update} />
      </Section>

      <AvailableSwitch query={query} update={update} />
    </div>
  );
}
