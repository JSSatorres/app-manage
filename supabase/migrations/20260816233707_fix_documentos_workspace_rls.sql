-- Alinea documentos con el modelo multifuente de permisos por workspace.
-- La sede, cuando existe, debe pertenecer al workspace del documento.
BEGIN;

DROP POLICY IF EXISTS allow_all_documentos ON public.documentos;
DROP POLICY IF EXISTS documentos_select ON public.documentos;
DROP POLICY IF EXISTS documentos_mutate ON public.documentos;
DROP POLICY IF EXISTS documentos_workspace_select ON public.documentos;
DROP POLICY IF EXISTS documentos_workspace_insert ON public.documentos;
DROP POLICY IF EXISTS documentos_workspace_update ON public.documentos;
DROP POLICY IF EXISTS documentos_workspace_delete ON public.documentos;

CREATE POLICY documentos_workspace_select ON public.documentos
  FOR SELECT TO authenticated
  USING (public.is_workspace_storage_reader(workspace_id));

CREATE POLICY documentos_workspace_insert ON public.documentos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_storage_writer(workspace_id)
    AND (
      sede_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.sedes
        WHERE sedes.id = documentos.sede_id
          AND sedes.workspace_id = documentos.workspace_id
      )
    )
  );

CREATE POLICY documentos_workspace_update ON public.documentos
  FOR UPDATE TO authenticated
  USING (public.is_workspace_storage_writer(workspace_id))
  WITH CHECK (
    public.is_workspace_storage_writer(workspace_id)
    AND (
      sede_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.sedes
        WHERE sedes.id = documentos.sede_id
          AND sedes.workspace_id = documentos.workspace_id
      )
    )
  );

CREATE POLICY documentos_workspace_delete ON public.documentos
  FOR DELETE TO authenticated
  USING (public.is_workspace_storage_writer(workspace_id));

COMMIT;
