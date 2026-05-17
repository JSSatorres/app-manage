"use client";

import { useQuery } from "@/hooks/useQuery";
import { fetchSedesLookup } from "@/services/sedes-lookup.service";
import type { SedeLookupItem } from "@/services/sedes-lookup.service";

export function useSedesLookup() {
  return useQuery<SedeLookupItem[]>(() => fetchSedesLookup(), []);
}
