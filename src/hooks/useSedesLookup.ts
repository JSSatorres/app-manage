"use client";

import { useQuery } from "@/hooks/useQuery";
import { queryKeys } from "@/hooks/queryKeys";
import { fetchSedesLookup } from "@/services/sedes-lookup.service";
import type { SedeLookupItem } from "@/services/sedes-lookup.service";

export function useSedesLookup() {
  return useQuery<SedeLookupItem[]>(() => fetchSedesLookup(), queryKeys.sedes.lookup());
}
