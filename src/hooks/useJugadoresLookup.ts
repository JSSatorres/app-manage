"use client";

import { useQuery } from "@/hooks/useQuery";
import {
  fetchJugadoresLookupBySedeId,
  type JugadorLookupItem,
} from "@/services/jugadores-lookup.service";

export function useJugadoresLookup(sedeId: string | null) {
  return useQuery<JugadorLookupItem[]>(
    () =>
      sedeId
        ? fetchJugadoresLookupBySedeId(sedeId)
        : Promise.resolve({ data: [], error: null }),
    [sedeId],
  );
}
