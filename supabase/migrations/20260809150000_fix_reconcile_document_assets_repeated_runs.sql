-- Una misma transacción de prueba o job puede invocar la conciliación más de una vez.
BEGIN;

ALTER FUNCTION public.reconcile_document_asset_metadata(jsonb, uuid[], uuid)
  RENAME TO reconcile_document_asset_metadata_impl;

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
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'RECONCILIATION_SERVICE_ROLE_REQUIRED' USING ERRCODE = '42501';
  END IF;

  DROP TABLE IF EXISTS pg_temp.reconciliation_storage_objects;
  RETURN public.reconcile_document_asset_metadata_impl(
    p_storage_objects,
    p_deleted_asset_ids,
    p_run_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_document_asset_metadata(jsonb, uuid[], uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reconcile_document_asset_metadata_impl(jsonb, uuid[], uuid)
  FROM PUBLIC, anon, authenticated;

COMMIT;
