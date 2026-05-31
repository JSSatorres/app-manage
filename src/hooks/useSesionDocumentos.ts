"use client";

import { useCallback } from "react";
import { useQuery } from "@/hooks/useQuery";
import { useMutation } from "@/hooks/useMutation";
import { queryKeys } from "@/hooks/queryKeys";
import {
  attachDocumentoToSesion,
  detachDocumentoFromSesion,
  fetchDocumentosBySesion,
} from "@/services/sesion-documentos.service";
import type { Documento } from "@/types/documentos";

export function useSesionDocumentos(sesionId: string | null) {
  const invalidate = { invalidateKeys: [queryKeys.sesiones.documentos(sesionId)] };

  const query = useQuery<Documento[]>(
    () =>
      sesionId
        ? fetchDocumentosBySesion(sesionId)
        : Promise.resolve({ data: [], error: null }),
    queryKeys.sesiones.documentos(sesionId),
  );

  const attachMutation = useMutation<boolean, { documentoId: string }>(
    ({ documentoId }) =>
      sesionId
        ? attachDocumentoToSesion(sesionId, documentoId)
        : Promise.resolve({ data: false, error: new Error("Sesión no válida") }),
    invalidate,
  );

  const detachMutation = useMutation<boolean, { documentoId: string }>(
    ({ documentoId }) =>
      sesionId
        ? detachDocumentoFromSesion(sesionId, documentoId)
        : Promise.resolve({ data: false, error: new Error("Sesión no válida") }),
    invalidate,
  );

  const attach = useCallback(
    async (documentoId: string) => {
      const ok = await attachMutation.mutate({ documentoId });
      if (ok) await query.refetch();
      return ok;
    },
    [attachMutation, query],
  );

  const detach = useCallback(
    async (documentoId: string) => {
      const ok = await detachMutation.mutate({ documentoId });
      if (ok) await query.refetch();
      return ok;
    },
    [detachMutation, query],
  );

  return {
    ...query,
    attach,
    detach,
    attachLoading: attachMutation.loading,
    detachLoading: detachMutation.loading,
  };
}
