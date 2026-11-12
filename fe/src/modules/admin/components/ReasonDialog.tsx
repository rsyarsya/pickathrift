"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type ReasonDialogProps = {
  open: boolean;
  title: string;
  description: string;
  reasons: string[];
  confirmLabel: string;
  tone: "danger" | "primary";
  busy?: boolean;
  onConfirm: (note: string) => void;
  onClose: () => void;
};

/** Dialog pilih alasan (M3.3 Tolak dan batalkan, Minta unggah ulang). Alasan dikirim ke Buyer. */
export function ReasonDialog({
  open,
  title,
  description,
  reasons,
  confirmLabel,
  tone,
  busy,
  onConfirm,
  onClose,
}: ReasonDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [choice, setChoice] = useState(reasons[0]!);
  const [other, setOther] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isOther = choice === reasons[reasons.length - 1];

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) {
      setChoice(reasons[0]!);
      setOther("");
      setError(null);
      dialog?.showModal();
    }
    if (!open && dialog?.open) dialog.close();
  }, [open, reasons]);

  function confirm() {
    if (isOther && other.trim().length < 5) {
      setError("Tulis alasannya, minimal 5 karakter.");
      return;
    }
    onConfirm(isOther ? other.trim() : choice);
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="reason-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && !busy && e.currentTarget.close()}
      className="m-auto w-[calc(100%-32px)] max-w-460 rounded-xl bg-canvas p-0 text-fg shadow-overlay"
    >
      <div className="flex flex-col gap-14 p-24">
        <h2 id="reason-title" className="text-[22px] font-medium tracking-[-0.02em]">
          {title}
        </h2>
        <p className="text-sm leading-relaxed text-muted">{description}</p>
        <fieldset className="flex flex-col gap-8" disabled={busy}>
          <legend className="sr-only">Alasan</legend>
          {reasons.map((reason) => (
            <label
              key={reason}
              className={cn(
                "flex items-center gap-10 rounded-md border bg-surface px-14 py-10 text-sm",
                choice === reason ? "border-fg" : "border-line",
              )}
            >
              <input
                type="radio"
                name="alasan"
                value={reason}
                checked={choice === reason}
                onChange={() => {
                  setChoice(reason);
                  setError(null);
                }}
                className="size-16 accent-fg"
              />
              {reason}
            </label>
          ))}
          {isOther && (
            <>
              <label htmlFor="reason-other" className="sr-only">
                Alasan lain
              </label>
              <textarea
                id="reason-other"
                rows={3}
                value={other}
                onChange={(e) => {
                  setOther(e.target.value);
                  setError(null);
                }}
                placeholder="Tulis alasan untuk Buyer"
                aria-invalid={!!error}
                aria-describedby={error ? "reason-error" : undefined}
                className={cn(
                  "w-full rounded-md border bg-surface px-14 py-10 text-sm outline-none focus:border-fg",
                  error ? "border-[1.5px] border-danger" : "border-line",
                )}
              />
              {error && (
                <p id="reason-error" className="text-caption text-danger">
                  {error}
                </p>
              )}
            </>
          )}
        </fieldset>
        <div className="flex flex-col gap-10 pt-4 sm:flex-row">
          <Button variant={tone} size="md" className="sm:flex-1" disabled={busy} onClick={confirm}>
            {busy ? "Memproses…" : confirmLabel}
          </Button>
          <Button
            variant="outline"
            size="md"
            className="sm:flex-1"
            disabled={busy}
            onClick={onClose}
          >
            Kembali
          </Button>
        </div>
      </div>
    </dialog>
  );
}
