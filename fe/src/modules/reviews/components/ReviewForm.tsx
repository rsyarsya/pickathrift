import { useState, type FormEvent } from "react";
import { shopPanel } from "@/components/layout/shopContent";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import {
  MAX_REVIEW_LENGTH,
  MIN_REVIEW_LENGTH,
  RATINGS,
  validateReview,
  type ReviewInput,
} from "../review";

export function ReviewForm({
  invalid = false,
  locked = false,
  pending = false,
  error,
  onSubmit,
}: {
  invalid?: boolean;
  locked?: boolean;
  pending?: boolean;
  error?: string | null;
  onSubmit?: (input: ReviewInput) => void;
}) {
  const [input, setInput] = useState({ rating: 0, body: invalid ? "Bagus" : "" });
  const [showErrors, setShowErrors] = useState(invalid);
  const errors = showErrors ? validateReview(input) : {};
  const ratingHint = errors.rating || "Pilih 1 sampai 5 bintang.";
  const bodyHint = errors.body || `Minimal ${MIN_REVIEW_LENGTH} karakter.`;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || locked) return;
    setShowErrors(true);
    const errors = validateReview(input);
    if (errors.rating || errors.body) {
      event.currentTarget
        .querySelector<HTMLElement>(errors.rating ? "#rating-1" : "#review-body")
        ?.focus();
      return;
    }
    onSubmit?.(input);
  }

  return (
    <form
      className={cn(shopPanel, "grid gap-14 p-18 md:p-20", locked && "border-dashed")}
      noValidate
      aria-busy={pending}
      onSubmit={submit}
    >
      <fieldset
        className="grid gap-8"
        disabled={locked || pending}
        aria-describedby={locked ? undefined : "rating-hint"}
      >
        <legend className={cn("mb-8 w-full text-body font-medium", locked && "text-muted")}>
          <span className="flex justify-between gap-8">
            Seberapa puas kamu?
            <span className="flex items-center gap-4 font-mono text-micro text-muted">
              {locked && <Icon name="lock" size={13} />}
              {locked ? "terkunci" : "wajib"}
            </span>
          </span>
        </legend>
        <div className="flex gap-8">
          {RATINGS.map((rating) => (
            <label key={rating} className="relative">
              <input
                id={`rating-${rating}`}
                type="radio"
                name="rating"
                value={rating}
                className="peer sr-only"
                checked={rating === input.rating}
                required
                aria-label={`${rating} bintang`}
                aria-invalid={errors.rating ? true : undefined}
                aria-describedby={locked ? undefined : "rating-hint"}
                onChange={() => setInput({ ...input, rating })}
              />
              <span
                className={cn(
                  "grid size-36 place-items-center rounded-sm peer-focus-visible:ring-2 peer-focus-visible:ring-brand",
                  rating <= input.rating ? "text-warning" : "text-line-strong",
                  !locked && "hover:text-warning",
                )}
              >
                <Icon name="star" size={28} filled={rating <= input.rating} />
              </span>
            </label>
          ))}
        </div>
        {!locked && (
          <p
            id="rating-hint"
            className={cn("text-caption", errors.rating ? "text-danger" : "text-muted")}
          >
            {ratingHint}
          </p>
        )}
      </fieldset>
      <div className={cn("grid gap-8", !locked && "border-t border-line pt-14")}>
        <label htmlFor="review-body" className={cn("text-body font-medium", locked && "sr-only")}>
          Ceritakan pengalamanmu
        </label>
        <textarea
          id="review-body"
          value={input.body}
          required
          disabled={locked || pending}
          maxLength={MAX_REVIEW_LENGTH}
          rows={locked ? 2 : 4}
          placeholder="Kondisi barang, ukuran, pengiriman, kemasan…"
          aria-invalid={errors.body ? true : undefined}
          aria-describedby={locked ? undefined : "review-body-hint"}
          onChange={(event) => setInput({ ...input, body: event.target.value })}
          className={cn(
            "w-full resize-y rounded-md border px-14 py-12 text-body",
            errors.body ? "border-danger bg-danger-bg" : "border-line bg-canvas/70",
            locked && "resize-none",
          )}
        />
        {!locked && (
          <div className="flex justify-between gap-8 text-caption">
            <p id="review-body-hint" className={errors.body ? "text-danger" : "text-muted"}>
              {bodyHint}
            </p>
            <p className="shrink-0 font-mono text-micro text-muted">
              {input.body.length}/{MAX_REVIEW_LENGTH}
            </p>
          </div>
        )}
      </div>
      {!locked && (
        <>
          {error && (
            <p role="alert" className="text-caption text-danger">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Mengirim ulasan…" : "Kirim ulasan"}
          </Button>
          <p className="text-caption text-muted">
            Ulasan tampil di Ulasan toko dengan nama depanmu. Satu pesanan bisa diulas sekali.
          </p>
        </>
      )}
    </form>
  );
}
