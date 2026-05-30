"use client";

import { useCallback, useMemo } from "react";
import { useMutation } from "@/hooks/useMutation";
import { useQuery } from "@/hooks/useQuery";
import { createEjercicio, deleteEjercicio, fetchEjercicios, updateEjercicio } from "@/services/ejercicios.service";
import { syncEjercicioDocumentos } from "@/services/ejercicio-documentos.service";
import type { Ejercicio, EjercicioCreateInput, EjercicioUpdateInput } from "@/types/ejercicios";

export function useEjercicios(sedeId: string | null) {
  const query = useQuery<Ejercicio[]>(
    () => sedeId ? fetchEjercicios(sedeId) : Promise.resolve({ data: [], error: null }),
    [sedeId],
  );

  const createMutation = useMutation<Ejercicio, EjercicioCreateInput>((input) => createEjercicio(input));
  const updateMutation = useMutation<Ejercicio, { id: string; input: EjercicioUpdateInput }>(
    ({ id, input }) => updateEjercicio(id, input),
  );
  const deleteMutation = useMutation<boolean, { id: string }>(({ id }) => deleteEjercicio(id));

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
    const created = await createMutation.mutate(input);
    if (!createMutation.errorMessage && created) {
      if (input.documentoIds?.length) {
        await syncEjercicioDocumentos(created.id, input.documentoIds);
      }
      await query.refetch();
    }
    return created;
  }, [createMutation, query]);

  const updateOne = useCallback(async (id: string, input: EjercicioUpdateInput) => {
    const updated = await updateMutation.mutate({ id, input });
    if (!updateMutation.errorMessage) {
      await syncEjercicioDocumentos(id, input.documentoIds ?? []);
      await query.refetch();
    }
    return updated;
  }, [updateMutation, query]);

  const deleteOne = useCallback(async (id: string) => {
    const ok = await deleteMutation.mutate({ id });
    if (ok) await query.refetch();
    return ok;
  }, [deleteMutation, query]);

  return { ...query, ...actions, createOne, updateOne, deleteOne };
}
