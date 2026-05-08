"use client";

import { useCallback, useMemo } from "react";
import { useMutation } from "@/hooks/useMutation";
import { useQuery } from "@/hooks/useQuery";
import {
  createParametro,
  deleteParametro,
  fetchParametrosByCategoria,
  updateParametro,
} from "@/services/parametros.service";
import type {
  ParametroSistema,
  ParametroSistemaCreateInput,
  ParametroSistemaUpdateInput,
} from "@/types/parametros";

export function useParametros(categoria: string, sedeId: string | null) {
  const query = useQuery<ParametroSistema[]>(
    () => sedeId
      ? fetchParametrosByCategoria(categoria, sedeId)
      : Promise.resolve({ data: [], error: null }),
    [categoria, sedeId],
  );

  const createMutation = useMutation<ParametroSistema, ParametroSistemaCreateInput>(
    (input) => createParametro(input),
  );
  const updateMutation = useMutation<ParametroSistema, { id: string; input: ParametroSistemaUpdateInput }>(
    ({ id, input }) => updateParametro(id, input),
  );
  const deleteMutation = useMutation<boolean, { id: string }>(({ id }) => deleteParametro(id));

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

  const createOne = useCallback(async (input: ParametroSistemaCreateInput) => {
    const created = await createMutation.mutate(input);
    if (created) await query.refetch();
    return created;
  }, [createMutation, query]);

  const updateOne = useCallback(async (id: string, input: ParametroSistemaUpdateInput) => {
    const updated = await updateMutation.mutate({ id, input });
    if (updated) await query.refetch();
    return updated;
  }, [updateMutation, query]);

  const deleteOne = useCallback(async (id: string) => {
    const ok = await deleteMutation.mutate({ id });
    if (ok) await query.refetch();
    return ok;
  }, [deleteMutation, query]);

  return { ...query, ...actions, createOne, updateOne, deleteOne };
}
