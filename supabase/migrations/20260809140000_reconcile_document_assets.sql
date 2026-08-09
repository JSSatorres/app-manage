-- Reconciliación de Storage autoritativa, idempotente y exclusiva del job de servidor.
BEGIN;

CREATE TABLE IF NOT EXISTS public.document_asset_reconciliation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES public.content_assets(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'reservation_expired', 'orphan_object_detected', 'ready_object_missing',
    'storage_bytes_mismatch', 'usage_adjusted', 'delete_completed'
  )),
  provider text,
  previous_bytes bigint,
  observed_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_asset_reconciliation_audit_workspace_created
  ON public.document_asset_reconciliation_audit (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_asset_reconciliation_audit_run
  ON public.document_asset_reconciliation_audit (run_id);

ALTER TABLE public.document_asset_reconciliation_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.document_asset_reconciliation_audit FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reconcile_document_asset_metadata(
  p_storage_objects jsonb,
  p_deleted_asset_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_run_id uuid DEFAULT gen_random_uuid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expired_count integer := 0;
  v_deleted_count integer := 0;
  v_adjusted_count integer := 0;
  v_deleting_assets jsonb := '[]'::jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'RECONCILIATION_SERVICE_ROLE_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_storage_objects) <> 'array' THEN
    RAISE EXCEPTION 'RECONCILIATION_STORAGE_OBJECTS_INVALID' USING ERRCODE = '22023';
  END IF;

  CREATE TEMP TABLE reconciliation_storage_objects (
    storage_path text PRIMARY KEY,
    size_bytes bigint NOT NULL CHECK (size_bytes >= 0)
  ) ON COMMIT DROP;

  INSERT INTO reconciliation_storage_objects (storage_path, size_bytes)
  SELECT object_item ->> 'path', (object_item ->> 'size_bytes')::bigint
  FROM jsonb_array_elements(p_storage_objects) AS object_item
  WHERE jsonb_typeof(object_item) = 'object'
    AND NULLIF(object_item ->> 'path', '') IS NOT NULL
    AND (object_item ->> 'size_bytes') ~ '^[0-9]+$'
  ON CONFLICT (storage_path) DO UPDATE
  SET size_bytes = EXCLUDED.size_bytes;

  PERFORM 1
  FROM public.workspace_storage_usage AS usage
  WHERE usage.workspace_id IN (
    SELECT DISTINCT reservation.workspace_id
    FROM public.storage_reservations AS reservation
    WHERE reservation.status IN ('reserved', 'uploading')
      AND reservation.expires_at <= now()
  )
  FOR UPDATE;

  WITH expired_reservations AS (
    UPDATE public.storage_reservations AS reservation
    SET status = 'expired', cancelled_at = now()
    WHERE reservation.status IN ('reserved', 'uploading')
      AND reservation.expires_at <= now()
    RETURNING reservation.workspace_id, reservation.asset_id, reservation.size_bytes
  ), expired_assets AS (
    UPDATE public.content_assets AS asset
    SET status = 'failed'
    FROM expired_reservations AS reservation
    WHERE asset.id = reservation.asset_id
      AND asset.status IN ('reserved', 'uploading')
    RETURNING asset.id
  ), released_usage AS (
    SELECT workspace_id, sum(size_bytes)::bigint AS released_bytes
    FROM expired_reservations
    GROUP BY workspace_id
  ), updated_usage AS (
    UPDATE public.workspace_storage_usage AS usage
    SET reserved_bytes = GREATEST(0, usage.reserved_bytes - released_usage.released_bytes),
        version = usage.version + 1,
        updated_at = now()
    FROM released_usage
    WHERE usage.workspace_id = released_usage.workspace_id
    RETURNING usage.workspace_id
  ), audit_rows AS (
    INSERT INTO public.document_asset_reconciliation_audit (
      run_id, workspace_id, asset_id, event_type, provider, previous_bytes, observed_bytes
    )
    SELECT p_run_id, reservation.workspace_id, reservation.asset_id, 'reservation_expired',
           'supabase_storage', reservation.size_bytes, 0
    FROM expired_reservations AS reservation
    RETURNING id
  )
  SELECT count(*) INTO v_expired_count FROM audit_rows;

  WITH orphan_objects AS (
    SELECT storage_object.storage_path, storage_object.size_bytes
    FROM reconciliation_storage_objects AS storage_object
    LEFT JOIN public.content_assets AS asset
      ON asset.provider = 'supabase_storage'
      AND asset.storage_path = storage_object.storage_path
    WHERE asset.id IS NULL
  )
  INSERT INTO public.document_asset_reconciliation_audit (
    run_id, workspace_id, event_type, provider, observed_bytes
  )
  SELECT p_run_id,
         (split_part(orphan_object.storage_path, '/', 1))::uuid,
         'orphan_object_detected', 'supabase_storage', orphan_object.size_bytes
  FROM orphan_objects AS orphan_object
  WHERE split_part(orphan_object.storage_path, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1 FROM public.workspaces AS workspace
      WHERE workspace.id = (split_part(orphan_object.storage_path, '/', 1))::uuid
    );

  WITH missing_ready_assets AS (
    UPDATE public.content_assets AS asset
    SET status = 'unavailable'
    WHERE asset.provider = 'supabase_storage'
      AND asset.status = 'ready'
      AND NOT EXISTS (
        SELECT 1 FROM reconciliation_storage_objects AS storage_object
        WHERE storage_object.storage_path = asset.storage_path
      )
    RETURNING asset.workspace_id, asset.id, asset.provider, asset.size_bytes
  )
  INSERT INTO public.document_asset_reconciliation_audit (
    run_id, workspace_id, asset_id, event_type, provider, previous_bytes, observed_bytes
  )
  SELECT p_run_id, asset.workspace_id, asset.id, 'ready_object_missing', asset.provider,
         asset.size_bytes, 0
  FROM missing_ready_assets AS asset;

  WITH divergent_assets AS (
    UPDATE public.content_assets AS asset
    SET size_bytes = storage_object.size_bytes
    FROM reconciliation_storage_objects AS storage_object
    WHERE asset.provider = 'supabase_storage'
      AND asset.status = 'ready'
      AND asset.storage_path = storage_object.storage_path
      AND asset.size_bytes <> storage_object.size_bytes
    RETURNING asset.workspace_id, asset.id, asset.provider, asset.size_bytes AS observed_bytes
  )
  INSERT INTO public.document_asset_reconciliation_audit (
    run_id, workspace_id, asset_id, event_type, provider, previous_bytes, observed_bytes
  )
  SELECT p_run_id, asset.workspace_id, asset.id, 'storage_bytes_mismatch', asset.provider,
         NULL, asset.observed_bytes
  FROM divergent_assets AS asset;

  WITH deleted_assets AS (
    UPDATE public.content_assets AS asset
    SET status = 'deleted'
    WHERE asset.id = ANY (p_deleted_asset_ids)
      AND asset.provider = 'supabase_storage'
      AND asset.status = 'deleting'
      AND NOT EXISTS (
        SELECT 1 FROM reconciliation_storage_objects AS storage_object
        WHERE storage_object.storage_path = asset.storage_path
      )
    RETURNING asset.workspace_id, asset.id, asset.provider, asset.size_bytes
  ), audit_rows AS (
    INSERT INTO public.document_asset_reconciliation_audit (
      run_id, workspace_id, asset_id, event_type, provider, previous_bytes, observed_bytes
    )
    SELECT p_run_id, asset.workspace_id, asset.id, 'delete_completed', asset.provider,
           asset.size_bytes, 0
    FROM deleted_assets AS asset
    RETURNING id
  )
  SELECT count(*) INTO v_deleted_count FROM audit_rows;

  WITH expected_usage AS (
    SELECT asset.workspace_id, COALESCE(sum(storage_object.size_bytes), 0)::bigint AS used_bytes
    FROM public.content_assets AS asset
    JOIN reconciliation_storage_objects AS storage_object
      ON storage_object.storage_path = asset.storage_path
    WHERE asset.provider = 'supabase_storage'
      AND asset.status = 'ready'
    GROUP BY asset.workspace_id
  ), changed_usage AS (
    UPDATE public.workspace_storage_usage AS usage
    SET used_bytes = COALESCE(expected_usage.used_bytes, 0),
        version = usage.version + 1,
        updated_at = now()
    FROM public.workspaces AS workspace
    LEFT JOIN expected_usage ON expected_usage.workspace_id = workspace.id
    WHERE usage.workspace_id = workspace.id
      AND usage.used_bytes <> COALESCE(expected_usage.used_bytes, 0)
    RETURNING usage.workspace_id, usage.used_bytes
  ), audit_rows AS (
    INSERT INTO public.document_asset_reconciliation_audit (
      run_id, workspace_id, event_type, provider, observed_bytes
    )
    SELECT p_run_id, usage.workspace_id, 'usage_adjusted', 'supabase_storage', usage.used_bytes
    FROM changed_usage AS usage
    RETURNING id
  )
  SELECT count(*) INTO v_adjusted_count FROM audit_rows;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('asset_id', asset.id, 'storage_path', asset.storage_path)), '[]'::jsonb)
  INTO v_deleting_assets
  FROM public.content_assets AS asset
  WHERE asset.provider = 'supabase_storage'
    AND asset.status = 'deleting';

  RETURN jsonb_build_object(
    'run_id', p_run_id,
    'expired_reservations', v_expired_count,
    'deleted_assets', v_deleted_count,
    'usage_adjustments', v_adjusted_count,
    'deleting_assets', v_deleting_assets
  );
END;
$$;

CREATE OR REPLACE VIEW public.document_storage_reconciliation_operational
WITH (security_invoker = true)
AS
SELECT usage.workspace_id,
       usage.used_bytes,
       COALESCE(asset_totals.ready_asset_bytes, 0)::bigint AS ready_asset_bytes,
       usage.used_bytes - COALESCE(asset_totals.ready_asset_bytes, 0)::bigint AS usage_asset_drift_bytes,
       COALESCE(request_totals.pending_requests, 0)::bigint AS pending_upgrade_requests,
       audit_totals.last_reconciled_at
FROM public.workspace_storage_usage AS usage
LEFT JOIN LATERAL (
  SELECT sum(asset.size_bytes)::bigint AS ready_asset_bytes
  FROM public.content_assets AS asset
  WHERE asset.workspace_id = usage.workspace_id
    AND asset.provider = 'supabase_storage'
    AND asset.status = 'ready'
) AS asset_totals ON true
LEFT JOIN LATERAL (
  SELECT count(*)::bigint AS pending_requests
  FROM public.storage_upgrade_requests AS request
  WHERE request.workspace_id = usage.workspace_id
    AND request.status = 'pending'
) AS request_totals ON true
LEFT JOIN LATERAL (
  SELECT max(audit.created_at) AS last_reconciled_at
  FROM public.document_asset_reconciliation_audit AS audit
  WHERE audit.workspace_id = usage.workspace_id
) AS audit_totals ON true;

REVOKE ALL ON FUNCTION public.reconcile_document_asset_metadata(jsonb, uuid[], uuid) FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.document_storage_reconciliation_operational TO authenticated;

COMMIT;
