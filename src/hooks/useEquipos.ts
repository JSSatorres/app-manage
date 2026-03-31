"use client";

import { useCallback, useMemo } from "react";
import { useMutation } from "@/hooks/useMutation";
import { useQuery } from "@/hooks/useQuery";
import {
  createEquipo,
  deleteEquipo,
  fetchEquiposForWorkspace,
  updateEquipo,
} from "@/services/equipos.service";
import type { Equipo, EquipoCreateInput, EquipoUpdateInput } from "@/types/equipos";

export function useEquipos(workspaceId: string | null) {
  const query = useQuery<Equipo[]>(
    () =>
      workspaceId
        ? fetchEquiposForWorkspace(workspaceId)
        : Promise.resolve({ data: [], error: null }),
    [workspaceId],
  );

  const createMutation = useMutation<Equipo, EquipoCreateInput>((input) => createEquipo(input));
  const updateMutation = useMutation<Equipo, { id: string; input: EquipoUpdateInput }>(
    ({ id, input }) => updateEquipo(id, input),
  );
  const deleteMutation = useMutation<boolean, { id: string }>(({ id }) => deleteEquipo(id));

  const actions = useMemo(() => {
    return {
      createLoading: createMutation.loading,
      updateLoading: updateMutation.loading,
      deleteLoading: deleteMutation.loading,
      createErrorMessage: createMutation.errorMessage,
      updateErrorMessage: updateMutation.errorMessage,
      deleteErrorMessage: deleteMutation.errorMessage,
    };
  }, [
    createMutation.loading,
    updateMutation.loading,
    deleteMutation.loading,
    createMutation.errorMessage,
    updateMutation.errorMessage,
    deleteMutation.errorMessage,
  ]);

  const createOne = useCallback(
    async (input: EquipoCreateInput) => {
      const created = await createMutation.mutate(input);
      if (created) await query.refetch();
      return created;
    },
    [createMutation, query],
  );

  const updateOne = useCallback(
    async (id: string, input: EquipoUpdateInput) => {
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
