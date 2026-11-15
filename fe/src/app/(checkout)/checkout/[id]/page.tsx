import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutScreen } from "@/modules/checkout/components/CheckoutScreen";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({ params }: PageProps<"/checkout/[id]">) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <p className="p-16" role="status">
          Memuat checkout…
        </p>
      }
    >
      <CheckoutScreen id={id} />
    </Suspense>
  );
}
