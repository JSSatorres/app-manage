CREATE OR REPLACE FUNCTION public.reserve_document_upload(
  p_documento_id uuid,
  p_size_bytes bigint,
  p_mime_type text
)
RETURNS TABLE (asset_id uuid, storage_path text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
DECLARE
  v_workspace_id uuid;
  v_asset_id uuid;
  v_path text;
  v_expires_at timestamptz := now() + interval '15 minutes';
  v_expired_bytes bigint;
  v_usage public.workspace_storage_usage%ROWTYPE;
BEGIN
  IF p_size_bytes IS NULL OR p_size_bytes <= 0 THEN
    RAISE EXCEPTION 'UPLOAD_SIZE_INVALID' USING ERRCODE = '22023';
  END IF;

  SELECT workspace_id INTO v_workspace_id
  FROM public.documentos
  WHERE id = p_documento_id;

  IF v_workspace_id IS NULL OR NOT public.is_workspace_storage_writer(v_workspace_id) THEN
    RAISE EXCEPTION 'DOCUMENT_WRITE_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  PERFORM public.ensure_workspace_storage_defaults(v_workspace_id);
  SELECT * INTO v_usage
  FROM public.workspace_storage_usage
  WHERE workspace_id = v_workspace_id
  FOR UPDATE;

  WITH expired AS (
    UPDATE public.storage_reservations
    SET status = 'expired', cancelled_at = now()
    WHERE workspace_id = v_workspace_id
      AND status IN ('reserved', 'uploading')
      AND public.storage_reservations.expires_at <= now()
    RETURNING size_bytes
  )
  SELECT COALESCE(sum(size_bytes), 0) INTO v_expired_bytes FROM expired;

  IF v_expired_bytes > 0 THEN
    UPDATE public.workspace_storage_usage
    SET reserved_bytes = GREATEST(0, reserved_bytes - v_expired_bytes),
        version = version + 1,
        updated_at = now()
    WHERE workspace_id = v_workspace_id;
    v_usage.reserved_bytes := GREATEST(0, v_usage.reserved_bytes - v_expired_bytes);
  END IF;

  IF v_usage.used_bytes + v_usage.reserved_bytes + p_size_bytes > v_usage.limit_bytes THEN
    RAISE EXCEPTION 'QUOTA_EXCEEDED' USING ERRCODE = 'P0001';
  END IF;

  v_asset_id := gen_random_uuid();
  v_path := format('%s/%s/%s', v_workspace_id, v_asset_id, gen_random_uuid());
  INSERT INTO public.content_assets (id, workspace_id, provider, status, storage_path, size_bytes, mime_type, created_by)
  VALUES (v_asset_id, v_workspace_id, 'supabase_storage', 'reserved', v_path, p_size_bytes, NULLIF(trim(p_mime_type), ''), auth.uid());

  INSERT INTO public.storage_reservations (workspace_id, asset_id, size_bytes, status, expires_at, created_by)
  VALUES (v_workspace_id, v_asset_id, p_size_bytes, 'reserved', v_expires_at, auth.uid());

  UPDATE public.workspace_storage_usage
  SET reserved_bytes = reserved_bytes + p_size_bytes,
      version = version + 1,
      updated_at = now()
  WHERE workspace_id = v_workspace_id;

  UPDATE public.documentos
  SET content_asset_id = v_asset_id
  WHERE id = p_documento_id;

  RETURN QUERY SELECT v_asset_id, v_path, v_expires_at;
END;
$$;
