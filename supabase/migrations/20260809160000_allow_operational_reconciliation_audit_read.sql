-- La vista security_invoker necesita privilegio y RLS de lectura sobre su auditoría opaca.
BEGIN;

DROP POLICY IF EXISTS document_asset_reconciliation_audit_workspace_select
  ON public.document_asset_reconciliation_audit;
CREATE POLICY document_asset_reconciliation_audit_workspace_select
  ON public.document_asset_reconciliation_audit
  FOR SELECT TO authenticated
  USING (public.is_workspace_storage_writer(workspace_id));

GRANT SELECT ON public.document_asset_reconciliation_audit TO authenticated;

COMMIT;
