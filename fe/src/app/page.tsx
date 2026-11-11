import { redirect } from "next/navigation";

// Landing (Figma "2 Landing D Final") belum digarap. Sementara beranda langsung ke katalog.
export default function Page() {
  redirect("/katalog");
}
