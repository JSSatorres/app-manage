"use client";

import { useCallback, useMemo } from "react";
import { useMutation } from "@/hooks/useMutation";
import { useQuery } from "@/hooks/useQuery";
import {
  deleteDocumento,
  fetchDocumentosBySedeIds,
  updateDocumento,
  uploadDocumento,
} from "@/services/documentos.service";
import type { Documento, DocumentoUpdateInput } from "@/types/documentos";

interface UploadDocumentoArgs {
  file: File;
  titulo: string;
  categoriaDoc: string | null;
  sedeId: string | null;
  sedeIds: string[];
  equipoIds: string[];
}

export function useDocumentos(sedeIds: string[]) {
  const sedeKey = useMemo(() => JSON.stringify(sedeIds), [sedeIds]);
  const query = useQuery<Documento[]>(
    () =>
      sedeIds.length > 0
        ? fetchDocumentosBySedeIds(sedeIds)
        : Promise.resolve({ data: [], error: null }),
    [sedeKey],
  );

  const createMutation = useMutation<Documento, UploadDocumentoArgs>((input) => uploadDocumento(input));
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
    async (input: UploadDocumentoArgs) => {
      const created = await createMutation.mutate(input);
      if (!createMutation.errorMessage) await query.refetch();
      return created;
    },
    [createMutation, query],
  );

  const updateOne = useCallback(
    async (id: string, input: DocumentoUpdateInput) => {
      const updated = await updateMutation.mutate({ id, input });
      if (!updateMutation.errorMessage) await query.refetch();
      return updated;
    },
    [updateMutation, query],
  );

  const deleteOne = useCallback(
    async (id: string) => {
      const ok = await deleteMutation.mutate({ id });
      if (!deleteMutation.errorMessage) await query.refetch();
      return ok;
    },
    [deleteMutation, query],
  );

  return { ...query, ...actions, createOne, updateOne, deleteOne };
}
