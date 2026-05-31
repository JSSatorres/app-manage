"use client";

import { useQuery } from "@/hooks/useQuery";
import { queryKeys } from "@/hooks/queryKeys";
import {
  fetchEntrenadoresLookupBySedeIds,
  type EntrenadorLookupItem,
} from "@/services/entrenadores-lookup.service";

export function useEntrenadoresLookupBySedes(sedeIds: string[]) {
  return useQuery<EntrenadorLookupItem[]>(
    () =>
      sedeIds.length > 0
        ? fetchEntrenadoresLookupBySedeIds(sedeIds)
        : Promise.resolve({ data: [], error: null }),
    queryKeys.entrenadores.lookupBySedes(sedeIds),
  );
}
