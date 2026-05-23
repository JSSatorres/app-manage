"use client";

import { useQuery } from "@/hooks/useQuery";
import {
  fetchEntrenadoresLookupByWorkspace,
  type EntrenadorLookupItem,
} from "@/services/entrenadores-lookup.service";

export function useEntrenadoresLookupByWorkspace(workspaceId: string | null) {
  return useQuery<EntrenadorLookupItem[]>(
    () =>
      workspaceId
        ? fetchEntrenadoresLookupByWorkspace(workspaceId)
        : Promise.resolve({ data: [], error: null }),
    [workspaceId],
  );
}
