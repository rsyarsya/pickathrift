"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useSession } from "@/modules/auth/useSession";
import { closeReminder, reminderClosed, shouldRemindAddress } from "../address-reminder";

/** Strip di bawah navbar selama alamat pengiriman Buyer belum diisi. Bisa ditutup. */
export function AddressReminder() {
  const { user } = useSession();
  const pathname = usePathname();
  const [closedFor, setClosedFor] = useState<string | null>(null);
  if (!user || !shouldRemindAddress(user, pathname)) return null;
  if (closedFor === user.id || reminderClosed(user.id)) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-12 bg-butter px-16 py-10 text-sm md:px-24 lg:px-48"
    >
      <p className="flex-1">
        Alamat pengiriman belum diisi. Isi sekarang supaya checkout lebih cepat.{" "}
        <Link href="/profil" className="font-medium whitespace-nowrap underline">
          Lengkapi profil →
        </Link>
      </p>
      <button
        type="button"
        aria-label="Tutup pengingat alamat"
        className="flex size-32 shrink-0 items-center justify-center rounded-full hover:bg-fg/10"
        onClick={() => {
          closeReminder(user.id);
          setClosedFor(user.id);
        }}
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
