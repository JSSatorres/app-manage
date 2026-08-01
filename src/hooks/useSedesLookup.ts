"use client";

import { useQuery } from "@/hooks/useQuery";
import { queryKeys } from "@/hooks/queryKeys";
import { fetchSedesLookup } from "@/services/sedes-lookup.service";
import type { SedeLookupItem } from "@/services/sedes-lookup.service";
import { useWorkspaceContext } from "@/lib/workspaceContext";

export function useSedesLookup() {
  const { activeWorkspaceId } = useWorkspaceContext();
  return useQuery<SedeLookupItem[]>(
    () =>
      activeWorkspaceId
        ? fetchSedesLookup(activeWorkspaceId)
        : Promise.resolve({ data: [], error: null }),
    queryKeys.sedes.lookup(activeWorkspaceId),
  );
}
