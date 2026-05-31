"use client";

import { useCallback, useMemo } from "react";
import { useMutation } from "@/hooks/useMutation";
import { useQuery } from "@/hooks/useQuery";
import {
  createJugador,
  deleteJugador,
  fetchJugadoresBySede,
  fetchJugadoresByWorkspace,
  updateJugador,
} from "@/services/jugadores.service";
import { queryKeys } from "@/hooks/queryKeys";
import type { Jugador, JugadorCreateInput, JugadorUpdateInput } from "@/types/jugadores";

// Mutar un jugador afecta a su relación N:M con equipos (y a las sedes), así que
// invalidamos también equipos y entrenadores para que sus listados/lookups se refresquen.
const INVALIDATE = {
  invalidateKeys: [
    queryKeys.jugadores.prefix,
    queryKeys.equipos.prefix,
    queryKeys.entrenadores.prefix,
  ],
};

export function useJugadores(workspaceId: string | null, sedeId?: string | null) {
  const query = useQuery<Jugador[]>(
    () => {
      if (sedeId) return fetchJugadoresBySede(sedeId);
      if (workspaceId) return fetchJugadoresByWorkspace(workspaceId);
      return Promise.resolve({ data: [], error: null });
    },
    queryKeys.jugadores.list(workspaceId, sedeId),
  );

  const createMutation = useMutation<Jugador, JugadorCreateInput>(
    (input) => createJugador(input),
    INVALIDATE,
  );
  const updateMutation = useMutation<Jugador, { id: string; input: JugadorUpdateInput }>(
    ({ id, input }) => updateJugador(id, input),
    INVALIDATE,
  );
  const deleteMutation = useMutation<boolean, { id: string }>(
    ({ id }) => deleteJugador(id),
    INVALIDATE,
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
