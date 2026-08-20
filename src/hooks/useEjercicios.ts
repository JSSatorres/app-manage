"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation } from "@/hooks/useMutation";
import { useQuery } from "@/hooks/useQuery";
import { createEjercicio, deleteEjercicio, fetchEjercicios, updateEjercicio } from "@/services/ejercicios.service";
import { syncEjercicioDocumentos } from "@/services/ejercicio-documentos.service";
import { queryKeys } from "@/hooks/queryKeys";
import type { Ejercicio, EjercicioCreateInput, EjercicioUpdateInput } from "@/types/ejercicios";

const INVALIDATE = { invalidateKeys: [queryKeys.ejercicios.prefix] };
const DOCUMENTOS_SYNC_ERROR_MESSAGE =
  "El ejercicio se guardó, pero no se pudieron asociar sus documentos. Edita el ejercicio para volver a intentarlo.";

export function useEjercicios(sedeId: string | null, workspaceId: string | null) {
  const [documentosErrorMessage, setDocumentosErrorMessage] = useState<string | null>(null);
  const query = useQuery<Ejercicio[]>(
    () => sedeId && workspaceId
      ? fetchEjercicios(sedeId, workspaceId)
      : Promise.resolve({ data: [], error: null }),
    queryKeys.ejercicios.list(workspaceId, sedeId),
  );

  const createMutation = useMutation<Ejercicio, EjercicioCreateInput>(
    (input) => createEjercicio(input),
    INVALIDATE,
  );
  const updateMutation = useMutation<Ejercicio, { id: string; input: EjercicioUpdateInput }>(
    ({ id, input }) => updateEjercicio(id, input),
    INVALIDATE,
  );
  const deleteMutation = useMutation<boolean, { id: string }>(
    ({ id }) => deleteEjercicio(id),
    INVALIDATE,
  );

  const actions = useMemo(() => ({
    createLoading: createMutation.loading,
    updateLoading: updateMutation.loading,
    deleteLoading: deleteMutation.loading,
    createErrorMessage: createMutation.errorMessage,
    updateErrorMessage: updateMutation.errorMessage,
    deleteErrorMessage: deleteMutation.errorMessage,
  }), [
    createMutation.loading, updateMutation.loading, deleteMutation.loading,
    createMutation.errorMessage, updateMutation.errorMessage, deleteMutation.errorMessage,
  ]);

  const createOne = useCallback(async (input: EjercicioCreateInput) => {
    setDocumentosErrorMessage(null);
    const created = await createMutation.mutate(input);
    if (!created) return created;

    if (input.documentoIds?.length) {
      const { error } = await syncEjercicioDocumentos(created.id, input.documentoIds);
      if (error) setDocumentosErrorMessage(DOCUMENTOS_SYNC_ERROR_MESSAGE);
    }

    await query.refetch();
    return created;
  }, [createMutation, query]);

  const updateOne = useCallback(async (id: string, input: EjercicioUpdateInput) => {
    setDocumentosErrorMessage(null);
    const updated = await updateMutation.mutate({ id, input });
    if (!updated) return updated;

    const { error } = await syncEjercicioDocumentos(id, input.documentoIds ?? []);
    if (error) setDocumentosErrorMessage(DOCUMENTOS_SYNC_ERROR_MESSAGE);

    await query.refetch();
    return updated;
  }, [updateMutation, query]);

  const deleteOne = useCallback(async (id: string) => {
    const ok = await deleteMutation.mutate({ id });
    if (ok) await query.refetch();
    return ok;
  }, [deleteMutation, query]);

  return {
    ...query,
    ...actions,
    documentosErrorMessage,
    createOne,
    updateOne,
    deleteOne,
  };
}
