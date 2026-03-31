"use client";

import { useQuery } from "@/hooks/useQuery";
import { fetchUsuarios } from "@/services/usuarios.service";
import type { Usuario } from "@/types/usuarios";

export function useUsuarios() {
  return useQuery<Usuario[]>(() => fetchUsuarios(), []);
}

