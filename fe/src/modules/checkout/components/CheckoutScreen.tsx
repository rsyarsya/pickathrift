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
import { getOrder } from "@/modules/orders/data/orders";
import { StockConflictDialog } from "@/modules/product/components/StockConflictDialog";
import type { ShippingAddress } from "@/modules/profile/address";
import { createOrder, loadCheckout } from "../data/checkout";
import { CheckoutForm } from "./CheckoutForm";
import { PaymentScreen } from "./PaymentScreen";
import { createPaymentSession } from "@/modules/orders/data/payment";

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
  user,
}: {
  data: Awaited<ReturnType<typeof loadCheckout>>;
  user: SessionUser;
}) {
  const [order, setOrder] = useState<Order | null>(data.order);
  const [pending, setPending] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actions = useProductActions();
  const { product } = data;

  async function submit(address: ShippingAddress) {
    if (pending) return;
    setPending(true);
    setError(null);
    let created: Order | null = null;
    try {
      created = await createOrder(product.id, user.email, address);
      setOrder(created);
      if (created.payment?.provider === "midtrans") {
        const session = await createPaymentSession(created);
        window.location.assign(session.redirectUrl);
      }
    } catch (error) {
      if (!created && error instanceof ApiError && error.code === "STOCK_CONFLICT")
        setConflict(true);
      else
        setError(
          created
            ? `Pesanan tersimpan. ${error instanceof ApiError ? error.message : "Pembayaran belum bisa dibuka. Periksa status di bawah."}`
            : error instanceof ApiError
              ? error.message
              : "Gagal membuat pesanan. Coba lagi.",
        );
      if (created) {
        try {
          setOrder(await getOrder(created.id, user.email));
        } catch {
          /* Order tersimpan; status dapat diperiksa ulang dari panel. */
        }
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={container}>
      {order && error && (
        <p role="alert" className="text-body text-danger">
          {error}
        </p>
      )}
      {order ? (
        <PaymentScreen
          key={`${order.id}:${order.status}`}
          order={order}
          account={data.account}
          onChange={(next) => {
            setOrder(next);
            setError(null);
          }}
          disabled={pending}
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
          onSubmit={(address) => void submit(address)}
        />
      )}
      <StockConflictDialog
        open={conflict}
        bottomSheet
        productName={product.name}
        similarHref={`/katalog?kategori=${encodeURIComponent(product.category)}`}
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
  user,
  orderId,
}: {
  id: string;
  user: SessionUser;
  orderId: string | null;
}) {
  const checkout = useAsync(() => loadCheckout(id, user.email, orderId), [id, user.email, orderId]);
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
  return <CheckoutContent data={checkout.data} user={user} />;
}

export function CheckoutScreen({ id }: { id: string }) {
  const params = useSearchParams();
  const orderId = params.get("pesanan");
  return (
    <BuyerOnly>
      {(user) => (
        <CheckoutLoader
          key={`${user.email}:${id}:${orderId ?? ""}`}
          id={id}
          user={user}
          orderId={orderId}
        />
      )}
    </BuyerOnly>
  );
}
