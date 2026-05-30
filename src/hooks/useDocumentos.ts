"use client";

import { useCallback, useMemo } from "react";
import { useMutation } from "@/hooks/useMutation";
import { useQuery } from "@/hooks/useQuery";
import {
  createDocumentoLink,
  deleteDocumento,
  fetchDocumentosBySedeIds,
  updateDocumento,
  uploadDocumento,
} from "@/services/documentos.service";
import type {
  Documento,
  DocumentoLinkCreateInput,
  DocumentoUpdateInput,
} from "@/types/documentos";

interface UploadDocumentoArgs {
  file: File;
  titulo: string;
  categoriaDoc: string | null;
  sedeId: string | null;
  sedeIds: string[];
  equipoIds: string[];
  workspaceId: string | null;
}

export function useDocumentos(sedeIds: string[], workspaceId?: string | null) {
  const sedeKey = useMemo(() => JSON.stringify(sedeIds), [sedeIds]);
  const query = useQuery<Documento[]>(
    () =>
      sedeIds.length > 0
        ? fetchDocumentosBySedeIds(sedeIds, workspaceId)
        : Promise.resolve({ data: [], error: null }),
    [sedeKey, workspaceId],
  );

  const createMutation = useMutation<Documento, UploadDocumentoArgs>((input) => uploadDocumento(input));
  const createLinkMutation = useMutation<Documento, DocumentoLinkCreateInput>((input) =>
    createDocumentoLink(input),
  );
  const updateMutation = useMutation<Documento, { id: string; input: DocumentoUpdateInput }>(
    ({ id, input }) => updateDocumento(id, input),
  );
  const deleteMutation = useMutation<boolean, { id: string }>(({ id }) => deleteDocumento(id));

  const actions = useMemo(() => {
    return {
      createLoading: createMutation.loading,
      createLinkLoading: createLinkMutation.loading,
      updateLoading: updateMutation.loading,
      deleteLoading: deleteMutation.loading,
      createErrorMessage: createMutation.errorMessage,
      createLinkErrorMessage: createLinkMutation.errorMessage,
      updateErrorMessage: updateMutation.errorMessage,
      deleteErrorMessage: deleteMutation.errorMessage,
    };
  }, [
    createMutation.loading,
    createLinkMutation.loading,
    updateMutation.loading,
    deleteMutation.loading,
    createMutation.errorMessage,
    createLinkMutation.errorMessage,
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

  const createLink = useCallback(
    async (input: DocumentoLinkCreateInput) => {
      const created = await createLinkMutation.mutate(input);
      if (!createLinkMutation.errorMessage) await query.refetch();
      return created;
    },
    [createLinkMutation, query],
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

  return { ...query, ...actions, createOne, createLink, updateOne, deleteOne };
}
