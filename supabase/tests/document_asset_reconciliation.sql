BEGIN;

CREATE TEMP TABLE reconciliation_test_context (
  workspace_id uuid NOT NULL,
  ready_asset_id uuid NOT NULL,
  expired_asset_id uuid NOT NULL,
  deleting_asset_id uuid NOT NULL
) ON COMMIT DROP;

INSERT INTO reconciliation_test_context VALUES (
  '41111111-0000-0000-0000-000000000001',
  '42222222-0000-0000-0000-000000000001',
  '43333333-0000-0000-0000-000000000001',
  '44444444-0000-0000-0000-000000000001'
);

INSERT INTO public.workspaces (id, name)
SELECT workspace_id, 'reconciliation test fixture' FROM reconciliation_test_context;

INSERT INTO public.workspace_storage_usage (workspace_id, used_bytes, reserved_bytes, limit_bytes)
SELECT workspace_id, 10, 5, 100 FROM reconciliation_test_context
ON CONFLICT (workspace_id) DO UPDATE
SET used_bytes = EXCLUDED.used_bytes,
    reserved_bytes = EXCLUDED.reserved_bytes,
    limit_bytes = EXCLUDED.limit_bytes,
    version = 0,
    updated_at = now();

INSERT INTO public.content_assets (id, workspace_id, provider, status, storage_path, size_bytes)
SELECT ready_asset_id, workspace_id, 'supabase_storage', 'ready',
       workspace_id::text || '/' || ready_asset_id::text || '/ready', 10
FROM reconciliation_test_context
UNION ALL
SELECT expired_asset_id, workspace_id, 'supabase_storage', 'reserved',
       workspace_id::text || '/' || expired_asset_id::text || '/expired', 5
FROM reconciliation_test_context
UNION ALL
SELECT deleting_asset_id, workspace_id, 'supabase_storage', 'deleting',
       workspace_id::text || '/' || deleting_asset_id::text || '/deleting', 7
FROM reconciliation_test_context;

INSERT INTO public.storage_reservations (workspace_id, asset_id, size_bytes, status, expires_at)
SELECT workspace_id, expired_asset_id, 5, 'reserved', now() - interval '1 minute'
FROM reconciliation_test_context;

SELECT set_config('request.jwt.claim.role', 'service_role', true);

DO $$
DECLARE
  context reconciliation_test_context%ROWTYPE;
  first_run jsonb;
  second_run jsonb;
  repeated_run jsonb;
  used_after_first bigint;
  used_after_second bigint;
BEGIN
  SELECT * INTO context FROM reconciliation_test_context;
  SELECT public.reconcile_document_asset_metadata(
    jsonb_build_array(
      jsonb_build_object('path', context.workspace_id::text || '/' || context.ready_asset_id::text || '/ready', 'size_bytes', 25),
      jsonb_build_object('path', context.workspace_id::text || '/00000000-0000-0000-0000-000000000001/orphan', 'size_bytes', 3),
      jsonb_build_object('path', context.workspace_id::text || '/' || context.deleting_asset_id::text || '/deleting', 'size_bytes', 7)
    )
  ) INTO first_run;

  SELECT used_bytes INTO used_after_first
  FROM public.workspace_storage_usage
  WHERE workspace_id = context.workspace_id;

  IF NOT EXISTS (
      SELECT 1 FROM public.storage_reservations
      WHERE asset_id = context.expired_asset_id AND status = 'expired'
    )
    OR NOT EXISTS (
      SELECT 1 FROM public.content_assets
      WHERE id = context.expired_asset_id AND status = 'failed'
    )
    OR NOT EXISTS (
      SELECT 1 FROM public.content_assets
      WHERE id = context.ready_asset_id AND size_bytes = 25
    )
    OR used_after_first <> 25
    OR NOT EXISTS (
      SELECT 1 FROM public.document_asset_reconciliation_audit
      WHERE run_id = (first_run ->> 'run_id')::uuid AND event_type = 'orphan_object_detected'
    ) THEN
    RAISE EXCEPTION 'la primera reconciliación debe expirar, detectar huérfano y ajustar bytes';
  END IF;

  SELECT public.reconcile_document_asset_metadata(
    jsonb_build_array(
      jsonb_build_object('path', context.workspace_id::text || '/' || context.ready_asset_id::text || '/ready', 'size_bytes', 25),
      jsonb_build_object('path', context.workspace_id::text || '/00000000-0000-0000-0000-000000000001/orphan', 'size_bytes', 3)
    ),
    ARRAY[context.deleting_asset_id]
  ) INTO second_run;

  SELECT used_bytes INTO used_after_second
  FROM public.workspace_storage_usage
  WHERE workspace_id = context.workspace_id;

  SELECT public.reconcile_document_asset_metadata(
    jsonb_build_array(
      jsonb_build_object('path', context.workspace_id::text || '/' || context.ready_asset_id::text || '/ready', 'size_bytes', 25),
      jsonb_build_object('path', context.workspace_id::text || '/00000000-0000-0000-0000-000000000001/orphan', 'size_bytes', 3)
    ),
    ARRAY[context.deleting_asset_id]
  ) INTO repeated_run;

  IF NOT EXISTS (
      SELECT 1 FROM public.content_assets
      WHERE id = context.deleting_asset_id AND status = 'deleted'
    )
    OR used_after_second <> 25
    OR (repeated_run ->> 'expired_reservations')::integer <> 0
    OR (repeated_run ->> 'deleted_assets')::integer <> 0 THEN
    RAISE EXCEPTION 'la eliminación y la ejecución repetida deben ser idempotentes';
  END IF;
END;
$$;

ROLLBACK;
