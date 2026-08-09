BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS storage_upgrade_requests_pending_unique
  ON public.storage_upgrade_requests (workspace_id, catalog_item_id)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.request_storage_upgrade(
  p_workspace_id uuid,
  p_catalog_item_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  workspace_id uuid,
  catalog_item_id uuid,
  requested_capacity_bytes bigint,
  monthly_price_minor integer,
  currency_code text,
  status text,
  requested_by uuid,
  requested_at timestamptz,
  notes text,
  is_existing boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  catalog_item public.storage_upgrade_catalog%ROWTYPE;
  pending_request public.storage_upgrade_requests%ROWTYPE;
  request_was_existing boolean := false;
BEGIN
  IF p_workspace_id IS NULL OR p_catalog_item_id IS NULL THEN
    RAISE EXCEPTION 'STORAGE_UPGRADE_INPUT_INVALID' USING ERRCODE = '22023';
  END IF;

  IF auth.uid() IS NULL OR NOT public.is_workspace_storage_writer(p_workspace_id) THEN
    RAISE EXCEPTION 'STORAGE_UPGRADE_NOT_ALLOWED' USING ERRCODE = '42501';
  END IF;

  SELECT catalog.*
  INTO catalog_item
  FROM public.storage_upgrade_catalog AS catalog
  WHERE catalog.id = p_catalog_item_id
    AND catalog.is_active
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STORAGE_UPGRADE_CATALOG_INACTIVE' USING ERRCODE = '22023';
  END IF;

  SELECT request.*
  INTO pending_request
  FROM public.storage_upgrade_requests AS request
  WHERE request.workspace_id = p_workspace_id
    AND request.catalog_item_id = p_catalog_item_id
    AND request.status = 'pending'
  FOR UPDATE;

  IF FOUND THEN
    RETURN QUERY
    SELECT
      pending_request.id,
      pending_request.workspace_id,
      pending_request.catalog_item_id,
      pending_request.requested_capacity_bytes,
      pending_request.monthly_price_minor,
      pending_request.currency_code,
      pending_request.status,
      pending_request.requested_by,
      pending_request.requested_at,
      pending_request.notes,
      true;
    RETURN;
  END IF;

  BEGIN
    INSERT INTO public.storage_upgrade_requests AS request (
      workspace_id,
      catalog_item_id,
      requested_capacity_bytes,
      monthly_price_minor,
      currency_code,
      status,
      requested_by,
      notes
    ) VALUES (
      p_workspace_id,
      catalog_item.id,
      catalog_item.capacity_bytes,
      catalog_item.monthly_price_minor,
      catalog_item.currency_code,
      'pending',
      auth.uid(),
      NULLIF(btrim(p_notes), '')
    )
    RETURNING request.* INTO pending_request;
  EXCEPTION WHEN unique_violation THEN
    request_was_existing := true;
    SELECT request.*
    INTO pending_request
    FROM public.storage_upgrade_requests AS request
    WHERE request.workspace_id = p_workspace_id
      AND request.catalog_item_id = p_catalog_item_id
      AND request.status = 'pending'
    FOR UPDATE;
  END;

  RETURN QUERY
  SELECT
    pending_request.id,
    pending_request.workspace_id,
    pending_request.catalog_item_id,
    pending_request.requested_capacity_bytes,
    pending_request.monthly_price_minor,
    pending_request.currency_code,
    pending_request.status,
    pending_request.requested_by,
    pending_request.requested_at,
    pending_request.notes,
    request_was_existing;
END;
$$;

DROP POLICY IF EXISTS storage_upgrade_requests_workspace_insert ON public.storage_upgrade_requests;
REVOKE INSERT ON TABLE public.storage_upgrade_requests FROM authenticated;

REVOKE ALL ON FUNCTION public.request_storage_upgrade(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_storage_upgrade(uuid, uuid, text) TO authenticated;

COMMIT;
