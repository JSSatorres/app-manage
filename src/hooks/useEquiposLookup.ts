"use client";

import { useQuery } from "@/hooks/useQuery";
import { queryKeys } from "@/hooks/queryKeys";
import { fetchEquiposLookupBySedeIds } from "@/services/equipos-lookup.service";
import type { EquipoLookupItem } from "@/services/equipos-lookup.service";

export function useEquiposLookup(sedeIds: string[]) {
  return useQuery<EquipoLookupItem[]>(
    () =>
      sedeIds.length > 0
        ? fetchEquiposLookupBySedeIds(sedeIds)
        : Promise.resolve({ data: [], error: null }),
    queryKeys.equipos.lookup(sedeIds),
  );
}
