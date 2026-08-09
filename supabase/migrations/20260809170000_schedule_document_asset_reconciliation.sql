-- Reconciliación horaria interna: no usa HTTP, JWT de cliente ni secretos.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.run_document_asset_reconciliation_cron()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
DECLARE
  v_storage_objects jsonb;
BEGIN
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('path', object.name, 'size_bytes', (object.metadata ->> 'size')::bigint)),
    '[]'::jsonb
  )
  INTO v_storage_objects
  FROM storage.objects AS object
  WHERE object.bucket_id = 'documentos'
    AND (object.metadata ->> 'size') ~ '^[0-9]+$';

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  RETURN public.reconcile_document_asset_metadata(v_storage_objects);
END;
$$;

REVOKE ALL ON FUNCTION public.run_document_asset_reconciliation_cron() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_document_asset_reconciliation_cron() TO postgres;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'reconcile-document-assets-hourly';

SELECT cron.schedule(
  'reconcile-document-assets-hourly',
  '17 * * * *',
  $cron$SELECT public.run_document_asset_reconciliation_cron();$cron$
);

COMMIT;
