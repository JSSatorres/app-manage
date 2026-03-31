"use client";

import { useCallback, useMemo } from "react";
import { useMutation } from "@/hooks/useMutation";
import { useQuery } from "@/hooks/useQuery";
import {
  createSesion,
  deleteSesion,
  fetchSesionesBySedeIds,
  updateSesion,
} from "@/services/sesiones.service";
import type { Sesion, SesionCreateInput, SesionUpdateInput } from "@/types/sesiones";

export function useSesiones(sedeIds: string[]) {
  const sedeKey = useMemo(() => JSON.stringify(sedeIds), [sedeIds]);
  const query = useQuery<Sesion[]>(
    () =>
      sedeIds.length > 0
        ? fetchSesionesBySedeIds(sedeIds)
        : Promise.resolve({ data: [], error: null }),
    [sedeKey],
  );

  const createMutation = useMutation<Sesion, SesionCreateInput>((input) => createSesion(input));
  const updateMutation = useMutation<Sesion, { id: string; input: SesionUpdateInput }>(
    ({ id, input }) => updateSesion(id, input),
  );
  const deleteMutation = useMutation<boolean, { id: string }>(({ id }) => deleteSesion(id));

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
      if (created) await query.refetch();
      return created;
    },
    [createMutation, query],
  );

  const updateOne = useCallback(
    async (id: string, input: SesionUpdateInput) => {
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
