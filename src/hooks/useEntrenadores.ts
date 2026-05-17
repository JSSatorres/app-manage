"use client";

import { useCallback, useMemo } from "react";
import { useMutation } from "@/hooks/useMutation";
import { useQuery } from "@/hooks/useQuery";
import {
  createEntrenador,
  deleteEntrenador,
  fetchEntrenadoresByWorkspace,
  updateEntrenador,
} from "@/services/entrenadores.service";
import type {
  Entrenador,
  EntrenadorCreateInput,
  EntrenadorUpdateInput,
} from "@/types/entrenadores";

export function useEntrenadores(workspaceId: string | null) {
  const query = useQuery<Entrenador[]>(
    () =>
      workspaceId
        ? fetchEntrenadoresByWorkspace(workspaceId)
        : Promise.resolve({ data: [], error: null }),
    [workspaceId],
  );

  const createMutation = useMutation<Entrenador, EntrenadorCreateInput>((input) =>
    createEntrenador(input),
  );
  const updateMutation = useMutation<Entrenador, { id: string; input: EntrenadorUpdateInput }>(
    ({ id, input }) => updateEntrenador(id, input),
  );
  const deleteMutation = useMutation<boolean, { id: string }>(({ id }) =>
    deleteEntrenador(id),
  );

  const actions = useMemo(
    () => ({
      createLoading: createMutation.loading,
      updateLoading: updateMutation.loading,
      deleteLoading: deleteMutation.loading,
      createErrorMessage: createMutation.errorMessage,
      updateErrorMessage: updateMutation.errorMessage,
      deleteErrorMessage: deleteMutation.errorMessage,
    }),
    [
      createMutation.loading,
      updateMutation.loading,
      deleteMutation.loading,
      createMutation.errorMessage,
      updateMutation.errorMessage,
      deleteMutation.errorMessage,
    ],
  );

  const createOne = useCallback(
    async (input: EntrenadorCreateInput) => {
      const created = await createMutation.mutate(input);
      if (created) await query.refetch();
      return created;
    },
    [createMutation, query],
  );

  const updateOne = useCallback(
    async (id: string, input: EntrenadorUpdateInput) => {
      const updated = await updateMutation.mutate({ id, input });
      if (updated) await query.refetch();
      return updated;
    },
    [updateMutation, query],
  );

  const deleteOne = useCallback(
    async (id: string) => {
      const ok = await deleteMutation.mutate({ id });
      if (ok) await query.refetch();
      return ok;
    },
    [deleteMutation, query],
  );

  return { ...query, ...actions, createOne, updateOne, deleteOne };
}
