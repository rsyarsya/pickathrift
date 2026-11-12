"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { Toast } from "@/components/ui/Toast";
import { useAsync } from "@/hooks/useAsync";
import { ApiError } from "@/lib/api";
import { BuyerOnly } from "@/modules/auth/components/BuyerOnly";
import type { SessionUser } from "@/modules/auth/useSession";
import { useProductActions } from "@/modules/catalog/useProductActions";
import type { Order } from "@/modules/orders/order";
import { StockConflictDialog } from "@/modules/product/components/StockConflictDialog";
import type { ShippingAddress } from "@/modules/profile/address";
import { createOrder, loadCheckout } from "../data/checkout";
import { CheckoutForm } from "./CheckoutForm";
import { PaymentScreen } from "./PaymentScreen";

const container =
  "mx-auto grid max-w-1440 gap-16 px-16 pt-16 pb-64 md:px-32 md:pt-24 lg:px-48 lg:pt-28 lg:pb-96";

function LoadingCheckout() {
  return (
    <p role="status" className={container}>
      Memuat checkout…
    </p>
  );
}

function CheckoutContent({
  data,
  demo,
  user,
}: {
  data: Awaited<ReturnType<typeof loadCheckout>>;
  demo: string | null;
  user: SessionUser;
}) {
  const [order, setOrder] = useState<Order | null>(data.order);
  const [pending, setPending] = useState(demo === "memproses");
  const [conflict, setConflict] = useState(demo === "konflik");
  const [error, setError] = useState<string | null>(
    demo === "koneksi"
      ? "Koneksi terputus sebelum ada hasil. Coba lagi untuk memeriksa pesananmu."
      : null,
  );
  const actions = useProductActions();
  const { product } = data;

  async function submit(address: ShippingAddress) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      setOrder(await createOrder(product.id, user.email, address, demo));
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setConflict(true);
      else
        setError(error instanceof ApiError ? error.message : "Gagal membuat pesanan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={container}>
      {order ? (
        <PaymentScreen
          key={`${order.id}:${order.status}`}
          order={order}
          account={data.account}
          rejectedProof={data.rejectedProof}
          onChange={setOrder}
          onRestart={() => setOrder(null)}
        />
      ) : (
        <CheckoutForm
          product={product}
          fromProfile={data.fromProfile}
          pending={pending}
          error={error}
          initialAddress={
            data.address ?? {
              recipient: user.name,
              phone: "",
              street: "",
              city: "",
              postalCode: "",
            }
          }
          invalid={demo === "alamat"}
          onSubmit={(address) => void submit(address)}
        />
      )}
      <StockConflictDialog
        open={conflict}
        bottomSheet
        productName={product.name}
        similarHref={`/katalog?jenis=${encodeURIComponent(product.category)}`}
        onClose={() => setConflict(false)}
        onSave={() => {
          actions.saveToWishlist(product);
          setConflict(false);
        }}
      />
      <Toast toast={actions.toast} onDone={actions.clearToast} />
    </div>
  );
}

function CheckoutLoader({
  id,
  demo,
  user,
}: {
  id: string;
  demo: string | null;
  user: SessionUser;
}) {
  const checkout = useAsync(() => loadCheckout(id, user.email, demo), [id, demo, user.email]);
  if (checkout.status === "loading") return <LoadingCheckout />;
  if (checkout.status === "error") {
    return (
      <StatusMessage
        tone="error"
        title="Checkout gagal dimuat"
        description={checkout.error.message}
        actions={
          checkout.error.status === 404 ? (
            <ButtonLink href="/katalog">Kembali ke katalog</ButtonLink>
          ) : (
            <Button onClick={checkout.reload}>Coba lagi</Button>
          )
        }
      />
    );
  }
  return <CheckoutContent data={checkout.data} demo={demo} user={user} />;
}

export function CheckoutScreen({ id }: { id: string }) {
  const demo = useSearchParams().get("demo");
  return (
    <BuyerOnly>
      {(user) => (
        <CheckoutLoader key={`${user.email}:${id}:${demo ?? ""}`} id={id} demo={demo} user={user} />
      )}
    </BuyerOnly>
  );
}
