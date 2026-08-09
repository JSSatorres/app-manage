SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version IN ('20260809140000', '20260809150000')
ORDER BY version;

SELECT to_regclass('public.document_asset_reconciliation_audit') AS audit_table,
       to_regclass('public.document_storage_reconciliation_operational') AS operational_view,
       to_regprocedure('public.reconcile_document_asset_metadata(jsonb,uuid[],uuid)') AS reconciliation_rpc;

SELECT count(*) AS remaining_test_workspaces
FROM public.workspaces
WHERE id = '41111111-0000-0000-0000-000000000001'::uuid;
