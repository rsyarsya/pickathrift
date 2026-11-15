import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { EMPTY_QUERY, parseQuery, toSearchParams } from "@/modules/catalog/query";
import type { CatalogQuery } from "@/modules/catalog/types";

/** Filter katalog dibaca dari dan ditulis ke URL. */
export function useCatalogQuery() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query = useMemo(() => parseQuery(new URLSearchParams(params)), [params]);

  function update(patch: Partial<CatalogQuery>) {
    const next = toSearchParams({ ...query, ...patch });
    const search = next.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }

  return {
    query,
    /** Kunci stabil untuk mendeteksi pergantian filter. */
    key: toSearchParams(query).toString(),
    update,
    reset: () => update({ ...EMPTY_QUERY, sort: query.sort }),
  };
}
