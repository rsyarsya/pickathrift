import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { overline } from "./OrderSummary";

const steps = ["Dipesan", "Bayar", "Verifikasi", "Diproses", "Dikirim", "Selesai"];

export function PaymentProgress({
  current,
  complete = false,
}: {
  current: number;
  complete?: boolean;
}) {
  return (
    <div>
      <p className={cn(overline, "mb-12 text-fg md:hidden")}>
        {complete
          ? "Semua langkah selesai"
          : `Langkah ${current + 1} dari ${steps.length} · ${steps[current]}`}
      </p>
      <ol aria-label="Progres pesanan" className="flex gap-6 md:flex-wrap md:items-center md:gap-8">
        {steps.map((step, index) => (
          <li
            key={step}
            aria-current={!complete && index === current ? "step" : undefined}
            className="flex flex-1 items-center gap-8 md:flex-none"
          >
            <span
              aria-hidden
              className={cn(
                "h-4 flex-1 rounded-full md:hidden",
                index <= current ? "bg-fg" : "bg-line",
              )}
            />
            <span
              aria-hidden
              className={cn(
                "hidden size-24 items-center justify-center rounded-full font-mono text-micro md:flex",
                complete || index < current
                  ? "bg-fg text-night-fg"
                  : index === current
                    ? "bg-peach"
                    : "bg-subtle",
              )}
            >
              {complete || index < current ? <Icon name="check" size={12} /> : index + 1}
            </span>
            <span className={cn("max-md:sr-only md:text-caption", index > current && "text-muted")}>
              {step}
            </span>
            {index < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "hidden h-px w-16 md:block lg:w-28",
                  index < current ? "bg-fg" : "bg-line",
                )}
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
