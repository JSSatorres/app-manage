"use client";

import { useCallback, useMemo } from "react";
import { useMutation } from "@/hooks/useMutation";
import { useQuery } from "@/hooks/useQuery";
import {
  cloneSede,
  createSede,
  deleteSede,
  fetchCloneableSedeContent,
  fetchSedes,
  updateSede,
} from "@/services/sedes.service";
import { queryKeys } from "@/hooks/queryKeys";
import type {
  CloneSedeInput,
  CloneSedeResponse,
  CloneableSedeContent,
  Sede,
  SedeCreateInput,
  SedeUpdateInput,
} from "@/types/sedes";

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

const CLONE_INVALIDATE = {
  awaitInvalidation: false,
  invalidateKeys: [
    queryKeys.sedes.prefix,
    queryKeys.equipos.prefix,
    queryKeys.sesiones.prefix,
    queryKeys.parametros.prefix,
    queryKeys.documentos.prefix,
    queryKeys.jugadores.prefix,
    queryKeys.entrenadores.prefix,
  ],
};

export interface UseSedesCloneOptions {
  isCloneMode?: boolean;
  sourceSedeId?: string | null;
}

export function useSedes(
  workspaceId: string | null,
  { isCloneMode = false, sourceSedeId = null }: UseSedesCloneOptions = {},
) {
  const query = useQuery<Sede[]>(
    () => (workspaceId ? fetchSedes(workspaceId) : Promise.resolve({ data: [], error: null })),
    queryKeys.sedes.list(workspaceId),
  );
  const canFetchCloneableContent = Boolean(workspaceId && isCloneMode && sourceSedeId);
  const cloneContentQuery = useQuery<CloneableSedeContent>(
    () =>
      canFetchCloneableContent
        ? fetchCloneableSedeContent(workspaceId!, sourceSedeId!)
        : Promise.resolve({ data: null, error: null }),
    queryKeys.sedes.cloneableContent(
      canFetchCloneableContent ? workspaceId : null,
      canFetchCloneableContent ? sourceSedeId : null,
    ),
  );

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
  const cloneMutation = useMutation<CloneSedeResponse, CloneSedeInput>(
    (input) => cloneSede(input),
    CLONE_INVALIDATE,
  );

  const actions = useMemo(() => ({
    createLoading: createMutation.loading,
    updateLoading: updateMutation.loading,
    deleteLoading: deleteMutation.loading,
    cloneLoading: cloneMutation.loading,
    createErrorMessage: createMutation.errorMessage,
    updateErrorMessage: updateMutation.errorMessage,
    deleteErrorMessage: deleteMutation.errorMessage,
    cloneErrorMessage: cloneMutation.errorMessage
      ? `No se ha podido clonar la sede: ${cloneMutation.errorMessage}`
      : null,
  }), [
    createMutation.loading, updateMutation.loading, deleteMutation.loading, cloneMutation.loading,
    createMutation.errorMessage, updateMutation.errorMessage, deleteMutation.errorMessage,
    cloneMutation.errorMessage,
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

  const cloneOne = useCallback(async (input: CloneSedeInput) => {
    return cloneMutation.mutate(input);
  }, [cloneMutation]);

  return {
    ...query,
    ...actions,
    cloneableContent: cloneContentQuery.data,
    cloneableContentLoading: cloneContentQuery.loading,
    cloneableContentErrorMessage: cloneContentQuery.errorMessage
      ? `No se ha podido cargar el contenido de la sede de origen: ${cloneContentQuery.errorMessage}`
      : null,
    createOne,
    updateOne,
    deleteOne,
    cloneOne,
  };
}
