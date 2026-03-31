"use client";

import { useMemo } from "react";
import { useQuery } from "@/hooks/useQuery";
import { fetchEquiposLookupBySedeIds } from "@/services/equipos-lookup.service";
import type { EquipoLookupItem } from "@/services/equipos-lookup.service";

export function useEquiposLookup(sedeIds: string[]) {
  const sedeKey = useMemo(() => JSON.stringify(sedeIds), [sedeIds]);
  return useQuery<EquipoLookupItem[]>(
    () =>
      sedeIds.length > 0
        ? fetchEquiposLookupBySedeIds(sedeIds)
        : Promise.resolve({ data: [], error: null }),
    [sedeKey],
  );
}
