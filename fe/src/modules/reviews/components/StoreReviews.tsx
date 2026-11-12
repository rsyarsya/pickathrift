import { shopContent, shopPanel } from "@/components/layout/shopContent";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { useAsync } from "@/hooks/useAsync";
import { cn } from "@/lib/cn";
import { listReviews } from "../data/reviews";
import { ratingSummary } from "../review";
import { ReviewCard, Stars } from "./ReviewCard";

function RatingOverview({ summary }: { summary: ReturnType<typeof ratingSummary> }) {
  return (
    <section
      aria-label="Ringkasan rating"
      className={cn(
        shopPanel,
        "grid gap-18 p-24 md:grid-cols-[120px_1fr] md:items-center md:gap-24",
      )}
    >
      <div className="grid gap-5">
        <p className="text-display tabular-nums">
          {summary.average.toLocaleString("id-ID", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}
        </p>
        <Stars rating={summary.average} size={18} />
        <p className="font-mono text-micro tracking-label text-muted uppercase">
          Dari {summary.total} ulasan
        </p>
      </div>
      <ul className="grid gap-6">
        {summary.distribution.map(({ rating, percent }) => (
          <li
            key={rating}
            className="grid grid-cols-[12px_1fr_36px] items-center gap-8 font-mono text-micro"
          >
            <span aria-hidden>{rating}</span>
            <progress
              aria-label={`Rating ${rating} bintang`}
              aria-valuetext={`${percent} persen`}
              value={percent}
              max={100}
              className="h-8 w-full appearance-none overflow-hidden rounded-full bg-subtle [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-warning [&::-webkit-progress-bar]:bg-subtle [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-warning"
            />
            <span className="text-right text-muted" aria-hidden>
              {percent}%
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StoreReviews({ email, demo }: { email?: string; demo: string | null }) {
  const result = useAsync(() => listReviews(demo, email), [email, demo]);
  const title = email ? "Ulasan saya" : "Ulasan toko";
  if (result.status === "loading")
    return (
      <p className={shopContent} role="status">
        Memuat ulasan…
      </p>
    );
  if (result.status === "error")
    return (
      <div className={shopContent}>
        <PageHeader title={title} overline="Ulasan" />
        <StatusMessage
          tone="error"
          title="Ulasan gagal dimuat"
          description={result.error.message}
          actions={<Button onClick={result.reload}>Coba lagi</Button>}
        />
      </div>
    );
  const summary = ratingSummary(result.data);
  return (
    <div className={cn(shopContent, "grid gap-16")}>
      <PageHeader title={title} overline={`${summary.total} ulasan`} />
      {summary.total ? (
        <>
          {!email && <RatingOverview summary={summary} />}
          <div className="grid gap-16 lg:grid-cols-3">
            {result.data.map((review, index) => (
              <ReviewCard key={review.id} review={review} index={index} />
            ))}
          </div>
        </>
      ) : (
        <StatusMessage
          tone="empty"
          title="Belum ada ulasan"
          description="Ulasan yang kamu tulis untuk pesanan selesai akan muncul di sini."
          actions={<ButtonLink href="/pesanan">Lihat pesanan saya</ButtonLink>}
        />
      )}
    </div>
  );
}
