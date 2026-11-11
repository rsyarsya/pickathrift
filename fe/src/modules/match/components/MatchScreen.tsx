"use client";

import { useSearchParams } from "next/navigation";
import { MatchForm } from "@/modules/match/components/MatchForm";
import { MatchResults } from "@/modules/match/components/MatchResults";
import { formFromParams, validate } from "@/modules/match/criteria";

/** B4 Cari yang Cocok. `?cari=1` dengan kriteria valid menampilkan hasil, selain itu form. */
export function MatchScreen() {
  const params = useSearchParams();
  const checked = validate(formFromParams(new URLSearchParams(params)));

  if (params.get("cari") === "1" && checked.ok) {
    return <MatchResults criteria={checked.criteria} demo={params.get("demo")} />;
  }
  // key: form diisi ulang dari URL setiap kali kembali lewat "Ubah kriteria".
  return <MatchForm key={params.toString()} />;
}
