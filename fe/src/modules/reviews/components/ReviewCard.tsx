import Image from "next/image";
import { shopPanel } from "@/components/layout/shopContent";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { RATINGS, type Review, type PublicReview } from "../review";

const date = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Jakarta",
});
const avatars = ["bg-peach", "bg-lilac", "bg-mint"];

export function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span
      className="flex w-fit items-center gap-2"
      role="img"
      aria-label={`${rating.toLocaleString("id-ID", { maximumFractionDigits: 1 })} dari 5 bintang`}
    >
      {RATINGS.map((star) => (
        <Icon
          key={star}
          name="star"
          size={size}
          filled={star <= Math.round(rating)}
          className={star <= Math.round(rating) ? "text-warning" : "text-line-strong"}
        />
      ))}
    </span>
  );
}

export function ReviewCard({
  review,
  index = 0,
  preview = false,
}: {
  review: Review & { product?: PublicReview["product"] };
  index?: number;
  preview?: boolean;
}) {
  const isRecent = preview && Date.now() - review.createdAt < 60_000;
  return (
    <article className={cn(shopPanel, "flex min-w-0 flex-col gap-10 p-20")}>
      {preview && (
        <p className="flex items-center gap-6 font-mono text-micro tracking-label text-muted uppercase">
          <Icon name="eye" size={14} /> Seperti ini dilihat pembeli lain
        </p>
      )}
      <div className="flex items-center gap-10">
        <span
          aria-hidden
          className={cn(
            "grid size-34 shrink-0 place-items-center rounded-full text-body",
            avatars[index % avatars.length],
          )}
        >
          {review.author.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-body font-medium wrap-anywhere">{review.author}</p>
          <p className="font-mono text-micro tracking-label text-muted uppercase">
            {isRecent ? "Baru saja" : date.format(review.createdAt)}
          </p>
        </div>
      </div>
      <Stars rating={review.rating} />
      <p className="text-body wrap-anywhere whitespace-pre-wrap">{review.body}</p>
      {review.product && (
        <div className="mt-auto flex items-center gap-8 pt-4 text-caption text-muted">
          {review.product.images[0] && (
            <Image
              src={review.product.images[0]}
              width={28}
              height={34}
              alt=""
              className="h-34 w-28 rounded-sm object-cover"
            />
          )}
          <span>{review.product.name}</span>
        </div>
      )}
    </article>
  );
}
