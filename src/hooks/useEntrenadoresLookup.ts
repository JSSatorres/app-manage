"use client";

import { useQuery } from "@/hooks/useQuery";
import { queryKeys } from "@/hooks/queryKeys";
import {
  fetchEntrenadoresLookupBySedeId,
  type EntrenadorLookupItem,
} from "@/services/entrenadores-lookup.service";

export function useEntrenadoresLookup(sedeId: string | null) {
  return useQuery<EntrenadorLookupItem[]>(
    () =>
      sedeId
        ? fetchEntrenadoresLookupBySedeId(sedeId)
        : Promise.resolve({ data: [], error: null }),
    queryKeys.entrenadores.lookupBySede(sedeId),
  );
}
