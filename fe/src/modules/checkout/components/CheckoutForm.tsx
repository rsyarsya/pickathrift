import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/cn";
import type { Product } from "@/modules/catalog/types";
import { validateAddress, type ShippingAddress } from "@/modules/profile/address";
import { checkoutColumns, OrderSummary, overline } from "./OrderSummary";

const addressFields = [
  {
    key: "recipient",
    label: "Nama penerima",
    autoComplete: "shipping name",
    className: "max-md:col-span-2",
  },
  { key: "phone", label: "Nomor HP", autoComplete: "shipping tel", className: "max-md:col-span-2" },
  {
    key: "street",
    label: "Alamat lengkap",
    autoComplete: "shipping street-address",
    className: "col-span-2",
  },
  { key: "city", label: "Kota", autoComplete: "shipping address-level2" },
  { key: "postalCode", label: "Kode pos", autoComplete: "shipping postal-code" },
] as const;

type CheckoutFormProps = {
  product: Product;
  initialAddress: ShippingAddress;
  fromProfile: boolean;
  pending: boolean;
  error: string | null;
  onSubmit: (address: ShippingAddress) => void;
};

export function CheckoutForm({
  product,
  initialAddress,
  fromProfile,
  pending,
  error,
  onSubmit,
}: CheckoutFormProps) {
  const [address, setAddress] = useState(initialAddress);
  const [showErrors, setShowErrors] = useState(false);
  const errors = validateAddress(address);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setShowErrors(true);
    const invalidField = addressFields.find(({ key }) => errors[key]);
    if (invalidField) {
      event.currentTarget.querySelector<HTMLElement>(`#shipping-${invalidField.key}`)?.focus();
      return;
    }
    onSubmit(address);
  }

  const action = (
    <div className="grid gap-12">
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Menyiapkan pembayaran…" : error ? "Coba lagi" : "Lanjut ke pembayaran"}
      </Button>
      <p role={error ? "alert" : "status"} className={cn(overline, error && "text-danger")}>
        {error ||
          (pending
            ? "Jangan tutup halaman ini. Pesanan sedang diproses."
            : "Barang dikunci setelah pesanan berhasil dibuat.")}
      </p>
    </div>
  );

  return (
    <>
      <PageHeader title="Checkout" />
      <form onSubmit={submit} noValidate aria-busy={pending} className={checkoutColumns}>
        <div className="order-1 grid min-w-0 gap-14 lg:order-0">
          <fieldset disabled={pending} className="grid min-w-0 grid-cols-2 gap-14">
            <legend className={cn(overline, "mb-12")}>
              Alamat pengiriman{fromProfile ? " · Diambil dari profil" : ""}
            </legend>
            {addressFields.map(({ key, label, autoComplete, ...field }) => {
              const id = `shipping-${key}`;
              const error = showErrors && errors[key];
              const input = {
                id,
                name: key,
                autoComplete,
                required: true,
                value: address[key],
                onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  setAddress({ ...address, [key]: event.target.value }),
                "aria-invalid": error ? true : undefined,
                "aria-describedby": error ? `${id}-error` : undefined,
                className: cn(
                  "w-full min-w-0 rounded-md border bg-surface px-16 py-12 text-body",
                  error ? "border-danger bg-danger-bg" : "border-line",
                ),
              };
              return (
                <div
                  key={key}
                  className={cn(
                    "grid min-w-0 content-start gap-6",
                    "className" in field && field.className,
                  )}
                >
                  <label htmlFor={id} className="text-body font-medium">
                    {label}
                  </label>
                  {key === "street" ? (
                    <textarea
                      {...input}
                      rows={1}
                      className={cn(input.className, "min-h-48 resize-y [field-sizing:content]")}
                    />
                  ) : (
                    <input
                      {...input}
                      type={key === "phone" ? "tel" : "text"}
                      placeholder={key === "phone" ? "08xx xxxx xxxx" : undefined}
                      inputMode={key === "postalCode" ? "numeric" : undefined}
                    />
                  )}
                  {error && (
                    <p id={`${id}-error`} className="text-caption text-danger">
                      {error}
                    </p>
                  )}
                </div>
              );
            })}
          </fieldset>

          <fieldset>
            <legend className={cn(overline, "mb-12")}>Metode pembayaran</legend>
            <div className="rounded-md border border-line-strong bg-surface px-16 py-12">
              <span className="min-w-0">
                <span className="block text-body font-medium">
                  Virtual Account / QRIS · Midtrans
                </span>
                <span className="block text-caption text-muted">
                  Pilih bank atau QRIS setelah melanjutkan ke halaman pembayaran.
                </span>
              </span>
            </div>
          </fieldset>
        </div>
        <div>
          <OrderSummary product={product}>
            <div className="hidden lg:block">{action}</div>
          </OrderSummary>
        </div>
        <div className="order-2 lg:hidden">{action}</div>
      </form>
    </>
  );
}
