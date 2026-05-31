"use client";

import { useCallback, useMemo } from "react";
import { useMutation } from "@/hooks/useMutation";
import { useQuery } from "@/hooks/useQuery";
import { createSede, deleteSede, fetchSedes, updateSede } from "@/services/sedes.service";
import { queryKeys } from "@/hooks/queryKeys";
import type { Sede, SedeCreateInput, SedeUpdateInput } from "@/types/sedes";

// Mutar una sede puede afectar a equipos/jugadores/entrenadores que cuelgan de
// ella; invalidamos todos los dominios relacionados además de las propias sedes.
const INVALIDATE = {
  invalidateKeys: [
    queryKeys.sedes.prefix,
    queryKeys.equipos.prefix,
    queryKeys.jugadores.prefix,
    queryKeys.entrenadores.prefix,
  ],
};

export function useSedes() {
  const query = useQuery<Sede[]>(() => fetchSedes(), queryKeys.sedes.list(null));

  const createMutation = useMutation<Sede, SedeCreateInput>(
    (input) => createSede(input),
    INVALIDATE,
  );
  const updateMutation = useMutation<Sede, { id: string; input: SedeUpdateInput }>(
    ({ id, input }) => updateSede(id, input),
    INVALIDATE,
  );
  const deleteMutation = useMutation<boolean, { id: string }>(
    ({ id }) => deleteSede(id),
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

  const createOne = useCallback(async (input: SedeCreateInput) => {
    const created = await createMutation.mutate(input);
    if (created) await query.refetch();
    return created;
  }, [createMutation, query]);

  const updateOne = useCallback(async (id: string, input: SedeUpdateInput) => {
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
