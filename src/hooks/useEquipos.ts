"use client";

import { useCallback, useMemo } from "react";
import { useMutation } from "@/hooks/useMutation";
import { useQuery } from "@/hooks/useQuery";
import {
  createEquipo,
  deleteEquipo,
  fetchEquipos,
  fetchEquiposByWorkspace,
  updateEquipo,
} from "@/services/equipos.service";
import { queryKeys, type ListPagination } from "@/hooks/queryKeys";
import type { Equipo, EquipoCreateInput, EquipoUpdateInput } from "@/types/equipos";

// Mutar un equipo afecta a su relación N:M con jugadores y entrenadores, así que
// invalidamos esos dominios para refrescar sus listados/lookups (chips, contadores).
const INVALIDATE = {
  invalidateKeys: [
    queryKeys.equipos.prefix,
    queryKeys.jugadores.prefix,
    queryKeys.entrenadores.prefix,
  ],
};

/**
 * `pagination` (server-side, opcional) solo se aplica cuando se lista por
 * workspace completo (`sedeId` vacío): `fetchEquipos` (por sede) no soporta
 * paginación todavía, así que con un filtro de sede activo se sigue cargando
 * la lista completa (comportamiento actual, sin cambios).
 */
export function useEquipos(
  workspaceId: string | null,
  sedeId?: string | null,
  pagination?: ListPagination,
) {
  const query = useQuery<Equipo[]>(
    () => {
      if (sedeId) return fetchEquipos(sedeId);
      if (workspaceId) {
        const range = pagination
          ? { limit: pagination.pageSize, offset: pagination.page * pagination.pageSize }
          : undefined;
        return fetchEquiposByWorkspace(workspaceId, range);
      }
      return Promise.resolve({ data: [], error: null });
    },
    queryKeys.equipos.list(workspaceId, sedeId, pagination),
  );

  const createMutation = useMutation<Equipo, EquipoCreateInput>(
    (input) => createEquipo(input),
    INVALIDATE,
  );
  const updateMutation = useMutation<Equipo, { id: string; input: EquipoUpdateInput }>(
    ({ id, input }) => updateEquipo(id, input),
    INVALIDATE,
  );
  const deleteMutation = useMutation<boolean, { id: string }>(
    ({ id }) => deleteEquipo(id),
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

  return {
    ...query,
    ...actions,
    total: query.count ?? query.data?.length ?? 0,
    createOne,
    updateOne,
    deleteOne,
  };
}
