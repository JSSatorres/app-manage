"use client";

import { useCallback, useMemo } from "react";
import { useMutation } from "@/hooks/useMutation";
import { useQuery } from "@/hooks/useQuery";
import { queryKeys } from "@/hooks/queryKeys";
import {
  createSesion,
  deleteSesion,
  fetchSesionesBySedeIds,
  updateSesion,
} from "@/services/sesiones.service";
import type { Sesion, SesionCreateInput, SesionUpdateInput } from "@/types/sesiones";

const INVALIDATE = { invalidateKeys: [queryKeys.sesiones.prefix] };

export function useSesiones(sedeIds: string[]) {
  const sedeKey = useMemo(() => JSON.stringify(sedeIds), [sedeIds]);
  const queryResult = useQuery<Sesion[]>(
    () =>
      sedeIds.length > 0
        ? fetchSesionesBySedeIds(sedeIds)
        : Promise.resolve({ data: [], error: null }),
    queryKeys.sesiones.list(sedeIds),
  );

  const createMutation = useMutation<Sesion, SesionCreateInput>(
    (input) => createSesion(input),
    INVALIDATE,
  );
  const updateMutation = useMutation<Sesion, { id: string; input: SesionUpdateInput }>(
    ({ id, input }) => updateSesion(id, input),
    INVALIDATE,
  );
  const deleteMutation = useMutation<boolean, { id: string }>(
    ({ id }) => deleteSesion(id),
    INVALIDATE,
  );

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
    async (input: SesionCreateInput) => {
      const created = await createMutation.mutate(input);
      return created;
    },
    [createMutation],
  );

  const updateOne = useCallback(
    async (id: string, input: SesionUpdateInput) => {
      const updated = await updateMutation.mutate({ id, input });
      return updated;
    },
    [updateMutation],
  );

  const deleteOne = useCallback(
    async (id: string) => {
      const ok = await deleteMutation.mutate({ id });
      return ok;
    },
    [deleteMutation],
  );

  return { ...queryResult, ...actions, createOne, updateOne, deleteOne };
}