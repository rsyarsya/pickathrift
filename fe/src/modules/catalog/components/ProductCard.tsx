import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import { StatusLabel } from "@/modules/catalog/components/StatusLabel";
import type { Product } from "@/modules/catalog/types";

type ProductCardProps = {
  product: Product;
  saved: boolean;
  onToggleWishlist: () => void;
  onCompare: () => void;
  /** Ganti tautan "+ Bandingkan" dengan isi lain, misalnya selisih ukuran di B4. */
  footer?: ReactNode;
  /** Foto pertama di layar dimuat lebih dulu. */
  priority?: boolean;
};

export function ProductCard({
  product,
  saved,
  onToggleWishlist,
  onCompare,
  footer,
  priority,
}: ProductCardProps) {
  const href = `/produk/${product.id}`;
  const sold = product.status === "sold";

  return (
    <article className="flex flex-col gap-14">
      <div className="relative">
        <Link href={href} tabIndex={-1} aria-hidden className="block">
          <Image
            src={product.images[0]!}
            alt=""
            width={640}
            height={800}
            sizes="(min-width: 1024px) 30vw, (min-width: 768px) 33vw, 50vw"
            priority={priority}
            className={cn(
              "aspect-[4/5] w-full rounded-sm bg-subtle object-cover transition-opacity",
              sold && "opacity-50",
            )}
          />
        </Link>
        <button
          type="button"
          onClick={onToggleWishlist}
          aria-pressed={saved}
          aria-label={saved ? `Hapus ${product.name} dari wishlist` : `Simpan ${product.name}`}
          className="absolute top-10 right-10 flex rounded-full bg-surface p-8 transition-transform hover:scale-105 lg:top-14 lg:right-14"
        >
          <Icon
            name="heart"
            size={18}
            filled={saved}
            className={cn(saved && "text-brand", saved && sold && "opacity-50")}
          />
        </button>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
          <h3 className="text-card">
            <Link href={href} className="hover:underline">
              {product.name}
            </Link>
          </h3>
          <p
            className={cn(
              "shrink-0 font-mono text-[15px] font-medium",
              sold && "text-muted line-through",
            )}
          >
            {formatRupiah(product.price)}
          </p>
        </div>
        <p className="font-mono text-xs tracking-[0.05em] text-muted uppercase">
          {product.brand} · {product.size} · {product.condition}
        </p>
        <StatusLabel status={product.status} />
        {footer ?? (
          <button
            type="button"
            onClick={onCompare}
            className="self-start text-sm underline underline-offset-2 hover:text-brand"
          >
            + Bandingkan
          </button>
        )}
      </div>
    </article>
  );
}

/** Kerangka kartu selama katalog dimuat (B1.3). */
export function ProductCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-10" aria-hidden>
      <div className="aspect-[4/5] rounded-sm bg-subtle" />
      <div className="h-14 w-2/3 rounded-full bg-subtle" />
      <div className="h-10 w-1/3 rounded-full bg-subtle" />
    </div>
  );
}
