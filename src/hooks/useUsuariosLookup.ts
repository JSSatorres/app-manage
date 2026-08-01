"use client";

import { useQuery } from "@/hooks/useQuery";
import { queryKeys } from "@/hooks/queryKeys";
import { fetchUsuariosLookup } from "@/services/usuarios-lookup.service";
import type { UsuarioLookupItem } from "@/services/usuarios-lookup.service";
import { useWorkspaceContext } from "@/lib/workspaceContext";

export function useUsuariosLookup() {
  const { activeWorkspaceId } = useWorkspaceContext();
  return useQuery<UsuarioLookupItem[]>(
    () =>
      activeWorkspaceId
        ? fetchUsuariosLookup(activeWorkspaceId)
        : Promise.resolve({ data: [], error: null }),
    queryKeys.usuarios.lookup(activeWorkspaceId),
  );
}

