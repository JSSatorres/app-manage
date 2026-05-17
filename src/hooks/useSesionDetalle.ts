"use client";

import { useQuery } from "@/hooks/useQuery";
import {
  fetchSesionDetalle,
  type SesionEjercicioItem,
} from "@/services/sesion-detalle.service";

export function useSesionDetalle(sesionId: string | null) {
  return useQuery<SesionEjercicioItem[]>(
    () =>
      sesionId
        ? fetchSesionDetalle(sesionId)
        : Promise.resolve({ data: [], error: null }),
    [sesionId],
  );
}
