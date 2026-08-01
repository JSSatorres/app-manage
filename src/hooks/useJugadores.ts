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
import { queryKeys, type ListPagination } from "@/hooks/queryKeys";
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

/**
 * `pagination` (server-side, opcional) solo se aplica cuando se lista por
 * workspace completo (`sedeId` vacío): `fetchJugadoresBySede` no soporta
 * paginación todavía, así que con un filtro de sede activo se sigue cargando
 * la lista completa (comportamiento actual, sin cambios).
 */
export function useJugadores(
  workspaceId: string | null,
  sedeId?: string | null,
  pagination?: ListPagination,
) {
  const query = useQuery<Jugador[]>(
    () => {
      if (sedeId) return fetchJugadoresBySede(sedeId);
      if (workspaceId) {
        const range = pagination
          ? { limit: pagination.pageSize, offset: pagination.page * pagination.pageSize }
          : undefined;
        return fetchJugadoresByWorkspace(workspaceId, range);
      }
      return Promise.resolve({ data: [], error: null });
    },
    queryKeys.jugadores.list(workspaceId, sedeId, pagination),
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

  return {
    ...query,
    ...actions,
    // Total de filas remoto cuando hay paginación server-side; si no, el
    // tamaño de la página cargada (comportamiento previo).
    total: query.count ?? query.data?.length ?? 0,
    createOne,
    updateOne,
    deleteOne,
  };
}
