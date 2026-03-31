"use client";

import { useCallback, useMemo } from "react";
import { useMutation } from "@/hooks/useMutation";
import { useQuery } from "@/hooks/useQuery";
import { createSede, deleteSede, fetchSedes, updateSede } from "@/services/sedes.service";
import type { Sede, SedeCreateInput, SedeUpdateInput } from "@/types/sedes";

export function useSedes(workspaceId: string | null) {
  const query = useQuery<Sede[]>(
    () =>
      workspaceId
        ? fetchSedes(workspaceId)
        : Promise.resolve({ data: [], error: null }),
    [workspaceId],
  );

  const createMutation = useMutation<Sede, SedeCreateInput>((input) => createSede(input));
  const updateMutation = useMutation<Sede, { id: string; input: SedeUpdateInput }>(
    ({ id, input }) => updateSede(id, input),
  );
  const deleteMutation = useMutation<boolean, { id: string }>(({ id }) => deleteSede(id));

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
    async (input: SedeCreateInput) => {
      const created = await createMutation.mutate(input);
      if (created) await query.refetch();
      return created;
    },
    [createMutation, query],
  );

  const updateOne = useCallback(
    async (id: string, input: SedeUpdateInput) => {
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

