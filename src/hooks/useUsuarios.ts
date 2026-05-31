"use client";

import { useQuery } from "@/hooks/useQuery";
import { queryKeys } from "@/hooks/queryKeys";
import { fetchUsuarios } from "@/services/usuarios.service";
import type { Usuario } from "@/types/usuarios";

export function useUsuarios() {
  return useQuery<Usuario[]>(() => fetchUsuarios(), queryKeys.usuarios.list());
}

