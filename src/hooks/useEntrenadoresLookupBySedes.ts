"use client";

import { useMemo } from "react";
import { useQuery } from "@/hooks/useQuery";
import {
  fetchEntrenadoresLookupBySedeIds,
  type EntrenadorLookupItem,
} from "@/services/entrenadores-lookup.service";

export function useEntrenadoresLookupBySedes(sedeIds: string[]) {
  const key = useMemo(() => JSON.stringify(sedeIds), [sedeIds]);
  return useQuery<EntrenadorLookupItem[]>(
    () =>
      sedeIds.length > 0
        ? fetchEntrenadoresLookupBySedeIds(sedeIds)
        : Promise.resolve({ data: [], error: null }),
    [key],
  );
}
