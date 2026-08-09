"use client";

import { useCallback, useMemo } from "react";
import { useMutation } from "@/hooks/useMutation";
import { useQuery } from "@/hooks/useQuery";
import { queryKeys } from "@/hooks/queryKeys";
import {
  fetchSesionBloques,
  replaceSesionBloques,
  type SesionBloquesData,
} from "@/services/sesion-bloques.service";
import type { SesionBloque, SesionBloqueReplaceInput } from "@/types/sesion-bloques";

const INVALIDATE = {
  invalidateKeys: [queryKeys.sesiones.prefix, queryKeys.documentos.prefix],
};

export function useSesionBloques(sesionId: string | null) {
  const queryResult = useQuery<SesionBloquesData>(
    () =>
      sesionId
        ? fetchSesionBloques(sesionId)
        : Promise.resolve({ data: null, error: null }),
    queryKeys.sesiones.bloques(sesionId),
  );

  const replaceMutation = useMutation<
    SesionBloque[],
    { sesionId: string; bloques: SesionBloqueReplaceInput[] }
  >(({ sesionId: targetSesionId, bloques }) => replaceSesionBloques(targetSesionId, bloques), INVALIDATE);

  const saveBloques = useCallback(
    async (bloques: SesionBloqueReplaceInput[]) => {
      if (!sesionId) return null;
      return replaceMutation.mutate({ sesionId, bloques });
    },
    [replaceMutation, sesionId],
  );

  const actions = useMemo(
    () => ({
      saveLoading: replaceMutation.loading,
      saveErrorMessage: replaceMutation.errorMessage,
    }),
    [replaceMutation.errorMessage, replaceMutation.loading],
  );

  return { ...queryResult, ...actions, saveBloques };
}
