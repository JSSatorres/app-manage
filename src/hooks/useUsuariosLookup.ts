"use client";

import { useQuery } from "@/hooks/useQuery";
import { queryKeys } from "@/hooks/queryKeys";
import { fetchUsuariosLookup } from "@/services/usuarios-lookup.service";
import type { UsuarioLookupItem } from "@/services/usuarios-lookup.service";

export function useUsuariosLookup() {
  return useQuery<UsuarioLookupItem[]>(() => fetchUsuariosLookup(), queryKeys.usuarios.lookup());
}

