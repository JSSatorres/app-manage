"use client";

import { useCallback, useMemo } from "react";
import { useMutation } from "@/hooks/useMutation";
import { useQuery } from "@/hooks/useQuery";
import {
  createJugador,
  deleteJugador,
  fetchJugadoresByWorkspace,
  updateJugador,
} from "@/services/jugadores.service";
import type { Jugador, JugadorCreateInput, JugadorUpdateInput } from "@/types/jugadores";

export function useJugadores(workspaceId: string | null) {
  const query = useQuery<Jugador[]>(
    () =>
      workspaceId
        ? fetchJugadoresByWorkspace(workspaceId)
        : Promise.resolve({ data: [], error: null }),
    [workspaceId],
  );

  const createMutation = useMutation<Jugador, JugadorCreateInput>((input) =>
    createJugador(input),
  );
  const updateMutation = useMutation<Jugador, { id: string; input: JugadorUpdateInput }>(
    ({ id, input }) => updateJugador(id, input),
  );
  const deleteMutation = useMutation<boolean, { id: string }>(({ id }) => deleteJugador(id));

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
    async (input: JugadorCreateInput) => {
      const created = await createMutation.mutate(input);
      if (created) await query.refetch();
      return created;
    },
    [createMutation, query],
  );

  const updateOne = useCallback(
    async (id: string, input: JugadorUpdateInput) => {
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
