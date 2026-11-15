"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { asideLink } from "@/components/ui/PageHeader";
import { ApiError } from "@/lib/api";
import { loadPaymentProof } from "../data/orders";
import type { Order } from "../order";

export function PaymentProof({ order }: { order: Order }) {
  return (
    <ProofViewer key={`${order.id}:${order.proof?.id ?? order.proof?.uploadedAt}`} order={order} />
  );
}

function ProofViewer({ order }: { order: Order }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const active = useRef(true);
  const objectUrl = useRef<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);

  async function view() {
    if (!dialog.current?.open) dialog.current?.showModal();
    if (pending || objectUrl.current || !order.proof) return;
    setPending(true);
    setError(null);
    try {
      if (order.proof.unavailable)
        throw new ApiError(404, "Bukti pembayaran tidak tersedia. Hubungi toko.");
      const blob = await loadPaymentProof(order.id);
      if (active.current) {
        objectUrl.current = URL.createObjectURL(blob);
        setUrl(objectUrl.current);
      }
    } catch (failure) {
      if (active.current)
        setError(failure instanceof ApiError ? failure.message : "Bukti gagal dimuat. Coba lagi.");
    } finally {
      if (active.current) setPending(false);
    }
  }
  if (!order.proof) return null;
  return (
    <div className="flex items-center gap-14 rounded-md border border-line bg-surface p-12">
      <div className="min-w-0 flex-1">
        <p className="text-body wrap-anywhere">{order.proof.name}</p>
        <p className="text-caption text-muted">
          {Math.ceil(order.proof.size / 1024)} KB · Bukti pembayaran
        </p>
      </div>
      <button type="button" className={asideLink} onClick={() => void view()}>
        Lihat
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="payment-proof-title"
        className="m-auto w-[calc(100%-32px)] max-w-580 rounded-xl bg-canvas p-24 text-fg shadow-overlay"
      >
        <div className="grid gap-16">
          <h2 id="payment-proof-title" className="text-card wrap-anywhere">
            {order.proof.name}
          </h2>
          {pending ? (
            <p role="status">Memuat bukti pembayaran…</p>
          ) : error ? (
            <div className="grid gap-12">
              <p role="alert" className="text-danger">
                {error}
              </p>
              <Button onClick={() => void view()}>Coba lagi</Button>
            </div>
          ) : url ? (
            <Image
              unoptimized
              src={url}
              alt="Bukti pembayaran yang diunggah"
              width={500}
              height={500}
              className="max-h-[65dvh] w-full object-contain"
            />
          ) : null}
          <Button variant="outline" onClick={() => dialog.current?.close()}>
            Tutup
          </Button>
        </div>
      </dialog>
    </div>
  );
}
