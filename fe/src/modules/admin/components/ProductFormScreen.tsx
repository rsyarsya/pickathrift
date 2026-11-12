"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { BackLink } from "@/components/ui/BackLink";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { Toast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { useToast } from "@/hooks/useToast";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatRupiah, parseRupiah } from "@/lib/format";
import { imageError, toDataUrl } from "@/lib/image";
import { AdminHeader, Panel } from "@/modules/admin/components/AdminParts";
import { getAdminProduct, saveProduct, type AdminProduct } from "@/modules/admin/data/products";
import {
  MAX_IMAGES,
  OPTIONS,
  formFromProduct,
  measurementLabels,
  sizeOptions,
  validateProductForm,
  type ProductForm,
  type ProductFormErrors,
} from "@/modules/admin/productForm";
import { StatusLabel } from "@/modules/catalog/components/StatusLabel";

const control = (invalid?: boolean, disabled?: boolean) =>
  cn(
    "w-full rounded-md border px-16 py-14 text-base outline-none focus:border-fg",
    invalid ? "border-[1.5px] border-danger bg-[#fff8f6]" : "border-line bg-surface",
    disabled && "cursor-not-allowed bg-subtle text-muted",
  );

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-caption text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="text-caption text-muted">{hint}</p>
      )}
    </div>
  );
}

function Select({
  id,
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder: string;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : undefined}
      className={cn(control(!!error, disabled), !value && "text-disabled-fg")}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((option) => (
        <option key={option} value={option} className="text-fg">
          {option}
        </option>
      ))}
    </select>
  );
}

/** Slot foto: foto utama besar + tiga foto detail. Berkas dikecilkan sebelum disimpan. */
function PhotoSlots({
  images,
  onChange,
  error,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  error?: string;
}) {
  const [fileError, setFileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(file: File | undefined, index: number) {
    if (!file) return;
    const problem = imageError(file);
    if (problem) return setFileError(problem);
    setFileError(null);
    setBusy(true);
    try {
      const url = await toDataUrl(file);
      const next = [...images];
      next[index] = url;
      onChange(next.filter(Boolean));
    } catch {
      setFileError("Foto tidak bisa dibaca. Coba berkas lain.");
    } finally {
      setBusy(false);
    }
  }

  const message = fileError ?? error;

  return (
    <div className="flex flex-col gap-10">
      <ul className="flex flex-wrap items-start gap-10" aria-busy={busy}>
        {Array.from({ length: MAX_IMAGES }, (_, i) => {
          const main = i === 0;
          const src = images[i];
          const size = main ? "h-188 w-150" : "h-120 w-96";
          // Slot detail baru bisa diisi berurutan setelah foto sebelumnya ada.
          if (!src && i > images.length) return null;
          return (
            <li key={i} className={cn("relative shrink-0", size)}>
              {src ? (
                <>
                  <Image
                    src={src}
                    alt={main ? "Foto utama" : `Foto detail ${i}`}
                    fill
                    sizes="150px"
                    className="rounded-[8px] object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => onChange(images.filter((_, j) => j !== i))}
                    aria-label={main ? "Hapus foto utama" : `Hapus foto detail ${i}`}
                    className="absolute top-6 right-6 flex rounded-full bg-surface p-4 shadow-card"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </>
              ) : (
                <label
                  className={cn(
                    "flex size-full cursor-pointer flex-col items-center justify-center gap-4 rounded-[8px] border-[1.5px] border-dashed text-micro focus-within:outline-3 focus-within:outline-brand",
                    main && message
                      ? "border-danger bg-[#fff8f6] text-danger"
                      : "border-line-strong bg-[#faf9f6] text-muted hover:border-fg",
                  )}
                >
                  <span className="text-[22px] font-medium" aria-hidden>
                    +
                  </span>
                  {main ? "Foto utama" : "Detail"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="sr-only"
                    onChange={(e) => {
                      void add(e.target.files?.[0], i);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </li>
          );
        })}
      </ul>
      {busy && <p className="text-caption text-muted">Memproses foto…</p>}
      {message && (
        <p role="alert" className="text-caption text-danger">
          {message}
        </p>
      )}
    </div>
  );
}

/** Pratinjau kartu katalog yang ikut berubah saat form diisi. */
function Preview({ form, product }: { form: ProductForm; product?: AdminProduct }) {
  const price = parseRupiah(form.price) ?? 0;
  const status = product?.status ?? "available";
  return (
    <Panel className="lg:sticky lg:top-24">
      <p className="font-mono text-micro tracking-label text-muted">PRATINJAU DI KATALOG</p>
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-subtle">
        {form.images[0] && (
          <Image src={form.images[0]} alt="" fill sizes="300px" className="object-cover" />
        )}
        <span className="absolute top-14 right-14 flex rounded-full bg-surface p-8">
          <Icon name="heart" size={18} />
        </span>
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-12">
          <p className="text-card">{form.name.trim() || "Nama barang"}</p>
          <p className="shrink-0 font-mono text-[15px] font-medium">{formatRupiah(price)}</p>
        </div>
        <p className="font-mono text-xs tracking-[0.05em] text-muted uppercase">
          {form.brand.trim() || "MEREK"} · {form.size || "UKURAN"} · {form.condition || "KONDISI"}
        </p>
        <StatusLabel status={status} />
        <span className="text-sm underline">+ Bandingkan</span>
      </div>
      <div className="flex flex-col gap-6 border-t border-line pt-12">
        <p className="font-mono text-nano tracking-label text-muted">STOK 1 · OTOMATIS</p>
        <p className="text-caption leading-relaxed">
          {status === "reserved"
            ? "Status Dipesan diatur sistem, bukan admin."
            : "Barang baru langsung berstatus Tersedia setelah disimpan."}
        </p>
      </div>
    </Panel>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-14 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
    />
  );
}

function Editor({ product, demo }: { product?: AdminProduct; demo: string | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const { toast, show, clear } = useToast();
  const [form, setForm] = useState<ProductForm>(() => formFromProduct(product));
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const locked = product?.status === "reserved";
  const errorCount = Object.keys(errors).length;

  // Setelah produk baru disimpan, halaman pindah ke mode edit dengan ?disimpan=1 (M2.5).
  const savedFlag = params.get("disimpan") === "1";
  useEffect(() => {
    if (!savedFlag || !product) return;
    show("✓ Produk disimpan · Tersedia di katalog", {
      label: "Lihat",
      href: `/produk/${product.id}`,
    });
    router.replace(`/admin/produk/${product.id}`, { scroll: false });
  }, [savedFlag, product, show, router]);

  function update<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);
    const result = validateProductForm(form);
    if (!result.ok) {
      setErrors(result.errors);
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>("[aria-invalid=true], [role=alert]")
          ?.scrollIntoView({ block: "center", behavior: "smooth" }),
      );
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const saved = await saveProduct(result.value, product?.id, demo);
      if (!product) {
        router.replace(`/admin/produk/${saved.id}?disimpan=1`);
        return;
      }
      setForm(formFromProduct({ ...product, ...saved }));
      show("✓ Perubahan disimpan", { label: "Lihat", href: `/produk/${saved.id}` });
    } catch (error) {
      setSaveError(error instanceof ApiError ? error.message : "Gagal menyimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  const title = product ? "Edit produk" : "Tambah produk";
  const actions = (
    <>
      <ButtonLink href="/admin/produk" variant="outline" size="sm" className="px-20 py-9">
        Batal
      </ButtonLink>
      <Button type="submit" form="product-form" size="sm" disabled={saving} className="px-20 py-9">
        {saving && <Spinner />}
        {saving ? "Menyimpan…" : "Simpan produk"}
      </Button>
    </>
  );
  const labels = measurementLabels(form.category);

  return (
    <div className="flex flex-col gap-18 px-16 pt-20 pb-120 md:px-24 lg:px-40 lg:pt-28 lg:pb-64">
      <div className="lg:hidden">
        <BackLink href="/admin/produk">Kelola produk</BackLink>
      </div>
      <AdminHeader
        overline={
          <Link href="/admin/produk" className="hidden hover:underline lg:inline">
            ← KELOLA PRODUK
          </Link>
        }
        title={title}
        actions={<div className="hidden gap-10 lg:flex">{actions}</div>}
      />

      {locked && (
        <p className="rounded-md bg-warning-bg px-16 py-12 text-sm leading-[1.45]">
          Barang ini sedang dipesan{product?.orderId ? ` (#${product.orderId})` : ""}. Harga dan
          ukuran dikunci sampai pesanan selesai atau dibatalkan.
        </p>
      )}
      {errorCount > 0 && (
        <p role="alert" className="rounded-md bg-danger-bg px-16 py-12 text-sm leading-[1.45]">
          Ada {errorCount} kolom yang perlu diperbaiki sebelum disimpan.
        </p>
      )}
      {saveError && (
        <p role="alert" className="rounded-md bg-danger-bg px-16 py-12 text-sm leading-[1.45]">
          {saveError}
        </p>
      )}

      <div className="flex flex-col gap-24 lg:flex-row lg:items-start">
        <form
          id="product-form"
          ref={formRef}
          noValidate
          onSubmit={submit}
          aria-busy={saving}
          className="flex min-w-0 flex-1 flex-col gap-14"
        >
          <fieldset disabled={saving} className="contents">
            <Panel title="Foto" hint="JPG atau PNG, maks 2 MB. Foto utama tampil di katalog.">
              <PhotoSlots
                images={form.images}
                onChange={(images) => update("images", images)}
                error={errors.images}
              />
            </Panel>

            <Panel title="Info barang">
              <Field id="nama" label="Nama barang" error={errors.name}>
                <input
                  id="nama"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Contoh: Work jacket · olive"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "nama-error" : undefined}
                  className={control(!!errors.name)}
                />
              </Field>
              <div className="flex flex-col gap-14 md:flex-row md:gap-12">
                <Field id="kategori" label="Kategori" error={errors.category}>
                  <Select
                    id="kategori"
                    value={form.category}
                    onChange={(v) => {
                      update("category", v as ProductForm["category"]);
                      // Pilihan ukuran berbeda untuk celana; kosongkan yang tidak berlaku.
                      if (
                        !locked &&
                        !sizeOptions(v as ProductForm["category"]).includes(form.size)
                      ) {
                        update("size", "");
                      }
                    }}
                    options={OPTIONS.categories}
                    placeholder="Pilih kategori"
                    error={errors.category}
                  />
                </Field>
                <Field id="merek" label="Merek" error={errors.brand}>
                  <input
                    id="merek"
                    value={form.brand}
                    onChange={(e) => update("brand", e.target.value)}
                    placeholder="Tanpa merek? Tulis “Vintage”"
                    aria-invalid={!!errors.brand}
                    aria-describedby={errors.brand ? "merek-error" : undefined}
                    className={control(!!errors.brand)}
                  />
                </Field>
              </div>
              <div className="flex flex-col gap-14 md:flex-row md:gap-12">
                <Field id="gaya" label="Gaya" error={errors.style}>
                  <Select
                    id="gaya"
                    value={form.style}
                    onChange={(v) => update("style", v as ProductForm["style"])}
                    options={OPTIONS.styles}
                    placeholder="Pilih gaya"
                    error={errors.style}
                  />
                </Field>
                <Field id="warna" label="Warna">
                  <input
                    id="warna"
                    value={form.color}
                    onChange={(e) => update("color", e.target.value)}
                    placeholder="Contoh: Olive"
                    className={control()}
                  />
                </Field>
              </div>
            </Panel>

            <Panel title="Ukuran dan kondisi">
              <div className="flex flex-col gap-14 md:flex-row md:gap-12">
                <Field
                  id="ukuran"
                  label="Ukuran label"
                  error={errors.size}
                  hint={locked ? "Dikunci selama barang dipesan." : undefined}
                >
                  <Select
                    id="ukuran"
                    value={form.size}
                    onChange={(v) => update("size", v)}
                    options={sizeOptions(form.category)}
                    placeholder="Pilih"
                    error={errors.size}
                    disabled={locked}
                  />
                </Field>
                <Field id="kondisi" label="Kondisi" error={errors.condition}>
                  <Select
                    id="kondisi"
                    value={form.condition}
                    onChange={(v) => update("condition", v as ProductForm["condition"])}
                    options={OPTIONS.conditions}
                    placeholder={`Pilih 1 dari ${OPTIONS.conditions.length} tingkat`}
                    error={errors.condition}
                  />
                </Field>
              </div>
            </Panel>

            <Panel
              title="Ukuran pakaian (cm) · opsional"
              hint="Ukur terbentang datar dengan cara yang sama untuk semua barang. Dipakai Cari yang Cocok, toleransi 2 cm."
            >
              <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
                {labels.map((label) => {
                  const key = `ukuran:${label}`;
                  const id = `cm-${label.replace(/\s+/g, "-").toLowerCase()}`;
                  return (
                    <Field key={label} id={id} label={label} error={errors[key]}>
                      <div
                        className={cn(
                          control(!!errors[key]),
                          "flex items-center gap-8 py-0 focus-within:border-fg",
                        )}
                      >
                        <input
                          id={id}
                          inputMode="decimal"
                          value={form.measurements[label] ?? ""}
                          onChange={(e) => {
                            setForm((prev) => ({
                              ...prev,
                              measurements: { ...prev.measurements, [label]: e.target.value },
                            }));
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next[key];
                              return next;
                            });
                          }}
                          placeholder="—"
                          aria-invalid={!!errors[key]}
                          aria-describedby={errors[key] ? `${id}-error` : undefined}
                          className="w-full min-w-0 bg-transparent py-14 outline-none placeholder:text-disabled-fg"
                        />
                        <span className="font-mono text-micro font-medium tracking-label">CM</span>
                      </div>
                    </Field>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Harga">
              <Field
                id="harga"
                label="Harga jual"
                error={errors.price}
                hint={locked ? "Dikunci selama barang dipesan." : undefined}
              >
                <input
                  id="harga"
                  inputMode="numeric"
                  value={form.price}
                  onChange={(e) => update("price", e.target.value)}
                  onBlur={() => {
                    const value = parseRupiah(form.price);
                    if (value !== null) update("price", formatRupiah(value));
                  }}
                  placeholder="Rp 0"
                  disabled={locked}
                  aria-invalid={!!errors.price}
                  aria-describedby={errors.price ? "harga-error" : undefined}
                  className={control(!!errors.price, locked)}
                />
              </Field>
            </Panel>
          </fieldset>
        </form>

        <aside className="w-full lg:w-340 lg:shrink-0">
          <Preview form={form} product={product} />
        </aside>
      </div>

      {/* Tombol simpan menempel di bawah layar ponsel dan tablet. */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex gap-10 border-t border-line bg-surface px-16 py-12 md:px-24 lg:hidden [&>*:last-child]:flex-1">
        {actions}
      </div>

      <Toast toast={toast} onDone={clear} />
    </div>
  );
}

/** M2 Tambah dan edit produk. Tanpa `id` = tambah. */
export function ProductFormScreen({ id }: { id?: string }) {
  const demo = useSearchParams().get("demo");
  const result = useAsync(() => (id ? getAdminProduct(id) : Promise.resolve(undefined)), [id]);

  if (result.status === "loading") {
    return (
      <div className="flex animate-pulse flex-col gap-18 px-16 pt-28 md:px-24 lg:px-40" aria-busy>
        <div className="h-36 w-1/3 rounded-full bg-subtle" />
        <div className="h-240 rounded-[12px] bg-surface" />
        <div className="h-320 rounded-[12px] bg-surface" />
      </div>
    );
  }
  if (result.status === "error") {
    return (
      <StatusMessage
        tone={result.error.status === 404 ? "empty" : "error"}
        title={result.error.status === 404 ? "Produk tidak ditemukan" : "Produk gagal dimuat"}
        description={result.error.message}
        actions={
          result.error.status === 404 ? (
            <ButtonLink href="/admin/produk" size="md">
              Kembali ke Kelola produk
            </ButtonLink>
          ) : (
            <Button size="md" onClick={result.reload}>
              Coba lagi
            </Button>
          )
        }
      />
    );
  }
  if (result.data?.status === "sold") {
    return (
      <StatusMessage
        tone="empty"
        title="Barang sudah terjual"
        description="Barang yang sudah terjual tidak bisa diubah lagi supaya riwayat pesanannya tetap sama."
        actions={
          <>
            <ButtonLink href={`/produk/${result.data.id}`} size="md">
              Lihat di toko
            </ButtonLink>
            <ButtonLink href="/admin/produk" variant="outline" size="md">
              Kembali
            </ButtonLink>
          </>
        }
      />
    );
  }
  return <Editor key={result.data?.id ?? "baru"} product={result.data} demo={demo} />;
}
