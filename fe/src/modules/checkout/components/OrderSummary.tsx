import Image from "next/image";
import type { ReactNode } from "react";
import { formatRupiah } from "@/lib/format";
import type { Product } from "@/modules/catalog/types";
import { orderTotal, SHIPPING_FEE } from "@/modules/orders/order";

export const overline = "font-mono text-micro tracking-label text-muted uppercase";
export const checkoutColumns = "grid items-start gap-16 lg:grid-cols-[10fr_7fr] lg:gap-48";

export function OrderSummary({
  product,
  children,
  title = "Ringkasan pesanan",
}: {
  product: Product;
  children?: ReactNode;
  title?: string;
}) {
  return (
    <section
      aria-labelledby="summary-title"
      className="grid min-w-0 gap-12 rounded-lg border border-line bg-surface p-24"
    >
      <h2 id="summary-title" className={overline}>
        {title}
      </h2>
      <div className="flex items-center gap-14">
        {product.images[0] && (
          <Image
            src={product.images[0]}
            alt=""
            width={64}
            height={80}
            className="h-80 w-64 shrink-0 rounded-sm object-cover"
          />
        )}
        <div className="min-w-0">
          <p className="text-body font-medium">{product.name}</p>
          <p className={overline}>
            {product.brand} · {product.size} · {product.condition} · 1 unit
          </p>
        </div>
      </div>
      <dl className="grid gap-10 text-body">
        <div className="flex justify-between gap-12">
          <dt>Subtotal</dt>
          <dd className="font-mono">{formatRupiah(product.price)}</dd>
        </div>
        <div className="flex justify-between gap-12">
          <dt>Ongkir tetap</dt>
          <dd className="font-mono">{formatRupiah(SHIPPING_FEE)}</dd>
        </div>
        <div className="flex justify-between gap-12 border-t border-line pt-10 text-card">
          <dt>Total</dt>
          <dd className="font-mono">{formatRupiah(orderTotal(product))}</dd>
        </div>
      </dl>
      {children}
    </section>
  );
}
