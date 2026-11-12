import { Suspense, type ReactNode } from "react";
import { AdminOnly } from "@/modules/admin/components/AdminOnly";
import { AdminShell } from "@/modules/admin/components/AdminShell";

/** Semua halaman admin kecuali /admin/masuk: dijaga sesi admin dan memakai sidebar. */
export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <AdminOnly>
        <AdminShell>{children}</AdminShell>
      </AdminOnly>
    </Suspense>
  );
}
