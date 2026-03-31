"use client";

import { useCallback, useMemo } from "react";
import { useMutation } from "@/hooks/useMutation";
import { useQuery } from "@/hooks/useQuery";
import {
  createDocumento,
  deleteDocumento,
  fetchDocumentosBySedeIds,
  updateDocumento,
} from "@/services/documentos.service";
import type { Documento, DocumentoCreateInput, DocumentoUpdateInput } from "@/types/documentos";

export function useDocumentos(sedeIds: string[]) {
  const sedeKey = useMemo(() => JSON.stringify(sedeIds), [sedeIds]);
  const query = useQuery<Documento[]>(
    () =>
      sedeIds.length > 0
        ? fetchDocumentosBySedeIds(sedeIds)
        : Promise.resolve({ data: [], error: null }),
    [sedeKey],
  );

  const createMutation = useMutation<Documento, DocumentoCreateInput>((input) => createDocumento(input));
  const updateMutation = useMutation<Documento, { id: string; input: DocumentoUpdateInput }>(
    ({ id, input }) => updateDocumento(id, input),
  );
  const deleteMutation = useMutation<boolean, { id: string }>(({ id }) => deleteDocumento(id));

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
    async (input: DocumentoCreateInput) => {
      const created = await createMutation.mutate(input);
      if (created) await query.refetch();
      return created;
    },
    [createMutation, query],
  );

  const updateOne = useCallback(
    async (id: string, input: DocumentoUpdateInput) => {
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
