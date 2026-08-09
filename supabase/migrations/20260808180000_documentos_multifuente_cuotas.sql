-- Catálogo multifuente de documentos y cuota privada por workspace.
-- Es aditiva: conserva las columnas heredadas de documentos durante la transición.

BEGIN;

CREATE TABLE IF NOT EXISTS public.content_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL,
  status text NOT NULL,
  original_url text,
  external_resource_id text,
  embed_url text,
  storage_path text,
  size_bytes bigint NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  mime_type text,
  checksum text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_assets_provider_check
    CHECK (provider IN ('youtube', 'google_drive', 'supabase_storage', 'external_legacy')),
  CONSTRAINT content_assets_status_check
    CHECK (status IN ('pending_validation', 'reserved', 'uploading', 'processing', 'ready', 'unavailable', 'rejected', 'failed', 'deleting', 'deleted')),
  CONSTRAINT content_assets_provider_shape_check CHECK (
    (provider = 'supabase_storage' AND storage_path IS NOT NULL AND original_url IS NULL AND external_resource_id IS NULL AND embed_url IS NULL)
    OR (provider = 'youtube' AND original_url IS NOT NULL AND external_resource_id IS NOT NULL AND embed_url IS NOT NULL AND storage_path IS NULL AND size_bytes = 0)
    OR (provider = 'google_drive' AND original_url IS NOT NULL AND external_resource_id IS NOT NULL AND storage_path IS NULL AND size_bytes = 0)
    OR (provider = 'external_legacy' AND storage_path IS NULL AND size_bytes = 0)
  )
);

ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS content_asset_id uuid;

ALTER TABLE public.documentos
  DROP CONSTRAINT IF EXISTS documentos_content_asset_id_fkey;
ALTER TABLE public.documentos
  ADD CONSTRAINT documentos_content_asset_id_fkey
  FOREIGN KEY (content_asset_id) REFERENCES public.content_assets(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.workspace_storage_usage (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  used_bytes bigint NOT NULL DEFAULT 0 CHECK (used_bytes >= 0),
  reserved_bytes bigint NOT NULL DEFAULT 0 CHECK (reserved_bytes >= 0),
  limit_bytes bigint NOT NULL DEFAULT 10737418240 CHECK (limit_bytes > 0),
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.storage_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.content_assets(id) ON DELETE CASCADE,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'uploading', 'completed', 'cancelled', 'expired')),
  expires_at timestamptz NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  cancelled_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.workspace_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entitlement_key text NOT NULL,
  capacity_bytes bigint NOT NULL CHECK (capacity_bytes > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'cancelled', 'expired')),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'billing', 'migration')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  accepted_catalog_item_id uuid,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_entitlements_workspace_key_unique UNIQUE (workspace_id, entitlement_key)
);

CREATE TABLE IF NOT EXISTS public.storage_upgrade_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  capacity_bytes bigint NOT NULL CHECK (capacity_bytes > 0),
  monthly_price_minor integer NOT NULL CHECK (monthly_price_minor >= 0),
  currency_code text NOT NULL DEFAULT 'EUR' CHECK (currency_code ~ '^[A-Z]{3}$'),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_entitlements
  DROP CONSTRAINT IF EXISTS workspace_entitlements_accepted_catalog_item_id_fkey;
ALTER TABLE public.workspace_entitlements
  ADD CONSTRAINT workspace_entitlements_accepted_catalog_item_id_fkey
  FOREIGN KEY (accepted_catalog_item_id) REFERENCES public.storage_upgrade_catalog(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.storage_upgrade_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  catalog_item_id uuid NOT NULL REFERENCES public.storage_upgrade_catalog(id) ON DELETE RESTRICT,
  requested_capacity_bytes bigint NOT NULL CHECK (requested_capacity_bytes > 0),
  monthly_price_minor integer NOT NULL CHECK (monthly_price_minor >= 0),
  currency_code text NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_content_assets_workspace_provider_status_created
  ON public.content_assets (workspace_id, provider, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_assets_storage_path_unique
  ON public.content_assets (storage_path) WHERE storage_path IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_storage_reservations_workspace_status_expiry
  ON public.storage_reservations (workspace_id, status, expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_storage_reservations_active_asset
  ON public.storage_reservations (asset_id) WHERE status IN ('reserved', 'uploading');
CREATE INDEX IF NOT EXISTS idx_workspace_entitlements_workspace_status
  ON public.workspace_entitlements (workspace_id, status, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_storage_upgrade_requests_workspace_status_requested
  ON public.storage_upgrade_requests (workspace_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_documentos_content_asset_id
  ON public.documentos (content_asset_id) WHERE content_asset_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_content_asset_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_content_asset_path_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.storage_path IS NOT NULL AND NEW.storage_path IS DISTINCT FROM OLD.storage_path THEN
    RAISE EXCEPTION 'content asset storage_path is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_document_content_asset_workspace()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.content_asset_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.content_assets asset
    WHERE asset.id = NEW.content_asset_id
      AND asset.workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'document content asset must belong to the document workspace';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_workspace_storage_defaults(p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.workspace_storage_usage (workspace_id)
  VALUES (p_workspace_id)
  ON CONFLICT (workspace_id) DO NOTHING;

  INSERT INTO public.workspace_entitlements (workspace_id, entitlement_key, capacity_bytes, status, source)
  VALUES (p_workspace_id, 'base_storage_10_gib', 10737418240, 'active', 'migration')
  ON CONFLICT (workspace_id, entitlement_key) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_workspace_storage_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.ensure_workspace_storage_defaults(NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_storage_reader(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT public.current_user_ws_role(p_workspace_id) IN ('superadmin', 'admin', 'gerente_sede', 'entrenador', 'jugador');
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_storage_writer(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT public.current_user_ws_role(p_workspace_id) IN ('superadmin', 'admin', 'gerente_sede');
$$;

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
      AND expires_at <= now()
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

CREATE OR REPLACE FUNCTION public.complete_document_upload(p_asset_id uuid)
RETURNS public.content_assets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
DECLARE
  v_asset public.content_assets%ROWTYPE;
  v_reservation public.storage_reservations%ROWTYPE;
  v_usage public.workspace_storage_usage%ROWTYPE;
  v_object_size bigint;
BEGIN
  SELECT * INTO v_asset FROM public.content_assets WHERE id = p_asset_id FOR UPDATE;
  IF NOT FOUND OR v_asset.provider <> 'supabase_storage' OR NOT public.is_workspace_storage_writer(v_asset.workspace_id) THEN
    RAISE EXCEPTION 'ASSET_WRITE_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF v_asset.status = 'ready' THEN
    RETURN v_asset;
  END IF;

  SELECT * INTO v_reservation
  FROM public.storage_reservations
  WHERE asset_id = p_asset_id AND status IN ('reserved', 'uploading')
  FOR UPDATE;

  IF NOT FOUND OR v_reservation.expires_at <= now() THEN
    RAISE EXCEPTION 'UPLOAD_RESERVATION_EXPIRED' USING ERRCODE = 'P0001';
  END IF;

  SELECT NULLIF(metadata ->> 'size', '')::bigint INTO v_object_size
  FROM storage.objects
  WHERE bucket_id = 'documentos'
    AND name = v_asset.storage_path;

  IF v_object_size IS NULL THEN
    RAISE EXCEPTION 'UPLOAD_OBJECT_MISSING' USING ERRCODE = 'P0001';
  END IF;
  IF v_object_size <> v_asset.size_bytes THEN
    RAISE EXCEPTION 'UPLOAD_SIZE_MISMATCH' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM storage.objects
    WHERE bucket_id = 'documentos'
      AND name = v_asset.storage_path
  ) THEN
    RAISE EXCEPTION 'UPLOAD_OBJECT_MISSING' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_usage
  FROM public.workspace_storage_usage
  WHERE workspace_id = v_asset.workspace_id
  FOR UPDATE;

  UPDATE public.storage_reservations
  SET status = 'completed', completed_at = now()
  WHERE id = v_reservation.id;

  UPDATE public.workspace_storage_usage
  SET reserved_bytes = GREATEST(0, reserved_bytes - v_reservation.size_bytes),
      used_bytes = used_bytes + v_reservation.size_bytes,
      version = version + 1,
      updated_at = now()
  WHERE workspace_id = v_asset.workspace_id;

  UPDATE public.content_assets
  SET status = 'ready'
  WHERE id = p_asset_id
  RETURNING * INTO v_asset;

  RETURN v_asset;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_document_upload(p_asset_id uuid)
RETURNS public.content_assets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_asset public.content_assets%ROWTYPE;
  v_reservation public.storage_reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_asset FROM public.content_assets WHERE id = p_asset_id FOR UPDATE;
  IF NOT FOUND OR v_asset.provider <> 'supabase_storage' OR NOT public.is_workspace_storage_writer(v_asset.workspace_id) THEN
    RAISE EXCEPTION 'ASSET_WRITE_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF v_asset.status IN ('failed', 'deleted') THEN
    RETURN v_asset;
  END IF;

  SELECT * INTO v_reservation
  FROM public.storage_reservations
  WHERE asset_id = p_asset_id AND status IN ('reserved', 'uploading')
  FOR UPDATE;

  IF FOUND THEN
    PERFORM 1 FROM public.workspace_storage_usage WHERE workspace_id = v_asset.workspace_id FOR UPDATE;
    UPDATE public.storage_reservations
    SET status = CASE WHEN expires_at <= now() THEN 'expired' ELSE 'cancelled' END,
        cancelled_at = now()
    WHERE id = v_reservation.id;
    UPDATE public.workspace_storage_usage
    SET reserved_bytes = GREATEST(0, reserved_bytes - v_reservation.size_bytes),
        version = version + 1,
        updated_at = now()
    WHERE workspace_id = v_asset.workspace_id;
  END IF;

  UPDATE public.content_assets
  SET status = 'failed'
  WHERE id = p_asset_id
  RETURNING * INTO v_asset;

  RETURN v_asset;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_document_asset_deleting(p_asset_id uuid)
RETURNS public.content_assets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_asset public.content_assets%ROWTYPE;
BEGIN
  SELECT * INTO v_asset FROM public.content_assets WHERE id = p_asset_id FOR UPDATE;
  IF NOT FOUND OR NOT public.is_workspace_storage_writer(v_asset.workspace_id) THEN
    RAISE EXCEPTION 'ASSET_WRITE_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF v_asset.status IN ('deleting', 'deleted') THEN
    RETURN v_asset;
  END IF;

  UPDATE public.content_assets
  SET status = 'deleting'
  WHERE id = p_asset_id
  RETURNING * INTO v_asset;
  RETURN v_asset;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_document_asset_delete(p_asset_id uuid)
RETURNS public.content_assets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_asset public.content_assets%ROWTYPE;
  v_accounted boolean;
BEGIN
  SELECT * INTO v_asset FROM public.content_assets WHERE id = p_asset_id FOR UPDATE;
  IF NOT FOUND OR NOT public.is_workspace_storage_writer(v_asset.workspace_id) THEN
    RAISE EXCEPTION 'ASSET_WRITE_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF v_asset.status = 'deleted' THEN
    RETURN v_asset;
  END IF;
  IF v_asset.status <> 'deleting' THEN
    RAISE EXCEPTION 'ASSET_NOT_MARKED_DELETING' USING ERRCODE = 'P0001';
  END IF;

  IF v_asset.provider = 'supabase_storage' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.storage_reservations
      WHERE asset_id = p_asset_id AND status = 'completed'
    ) INTO v_accounted;
    PERFORM 1 FROM public.workspace_storage_usage WHERE workspace_id = v_asset.workspace_id FOR UPDATE;
    UPDATE public.workspace_storage_usage
    SET used_bytes = CASE WHEN v_accounted THEN GREATEST(0, used_bytes - v_asset.size_bytes) ELSE used_bytes END,
        version = CASE WHEN v_accounted THEN version + 1 ELSE version END,
        updated_at = now()
    WHERE workspace_id = v_asset.workspace_id;
  END IF;

  UPDATE public.content_assets
  SET status = 'deleted'
  WHERE id = p_asset_id
  RETURNING * INTO v_asset;
  RETURN v_asset;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_storage_usage()
RETURNS TABLE (workspace_id uuid, used_bytes bigint, reserved_bytes bigint, limit_bytes bigint, usage_percent numeric, usage_state text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_workspace_id uuid;
BEGIN
  SELECT public.current_user_workspace_id() INTO v_workspace_id;
  IF v_workspace_id IS NULL OR NOT public.is_workspace_storage_reader(v_workspace_id) THEN
    RAISE EXCEPTION 'WORKSPACE_READ_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT usage.workspace_id,
         usage.used_bytes,
         usage.reserved_bytes,
         usage.limit_bytes,
         round(((usage.used_bytes + usage.reserved_bytes)::numeric / usage.limit_bytes::numeric) * 100, 2),
         CASE
           WHEN usage.used_bytes + usage.reserved_bytes >= usage.limit_bytes THEN 'limited'
           WHEN usage.used_bytes + usage.reserved_bytes >= usage.limit_bytes * 0.8 THEN 'warning'
           ELSE 'ok'
         END
  FROM public.workspace_storage_usage usage
  WHERE usage.workspace_id = v_workspace_id;
END;
$$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO public.storage_upgrade_catalog (code, name, capacity_bytes, monthly_price_minor, currency_code, sort_order)
VALUES
  ('extra_10_gib', '+10 GB', 10737418240, 300, 'EUR', 10),
  ('extra_25_gib', '+25 GB', 26843545600, 700, 'EUR', 20),
  ('extra_50_gib', '+50 GB', 53687091200, 1300, 'EUR', 30),
  ('extra_100_gib', '+100 GB', 107374182400, 2400, 'EUR', 40),
  ('extra_250_gib', '+250 GB', 268435456000, 5500, 'EUR', 50)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    capacity_bytes = EXCLUDED.capacity_bytes,
    monthly_price_minor = EXCLUDED.monthly_price_minor,
    currency_code = EXCLUDED.currency_code,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

SELECT public.ensure_workspace_storage_defaults(id)
FROM public.workspaces;

DO $$
DECLARE
  document_row public.documentos%ROWTYPE;
  new_asset_id uuid;
  provider_value text;
  resource_id_value text;
BEGIN
  FOR document_row IN
    SELECT * FROM public.documentos
    WHERE workspace_id IS NOT NULL AND content_asset_id IS NULL
  LOOP
    provider_value := CASE
      WHEN document_row.storage_path IS NOT NULL THEN 'supabase_storage'
      WHEN document_row.external_url ~* '^https://(www\.)?(youtube\.com|m\.youtube\.com|youtu\.be)/' THEN 'youtube'
      WHEN document_row.external_url ~* '^https://drive\.google\.com/' THEN 'google_drive'
      ELSE 'external_legacy'
    END;
    resource_id_value := CASE
      WHEN document_row.external_url ~* '^https://youtu\.be/[^/?#]+' THEN substring(document_row.external_url FROM '^https://youtu\.be/([^/?#]+)')
      WHEN document_row.external_url ~* '^https://(www\.|m\.)?youtube\.com/(watch\?v=|shorts/|embed/)[^/?#&]+' THEN substring(document_row.external_url FROM '^https://(?:www\.|m\.)?youtube\.com/(?:watch\?v=|shorts/|embed/)([^/?#&]+)')
      WHEN document_row.external_url ~* '^https://drive\.google\.com/file/d/[^/?#]+' THEN substring(document_row.external_url FROM '^https://drive\.google\.com/file/d/([^/?#]+)')
      WHEN document_row.external_url ~* '[?&]id=[^&#]+' THEN substring(document_row.external_url FROM '[?&]id=([^&#]+)')
      ELSE NULL
    END;
    IF provider_value IN ('youtube', 'google_drive') AND resource_id_value IS NULL THEN
      provider_value := 'external_legacy';
    END IF;

    INSERT INTO public.content_assets (
      workspace_id, provider, status, original_url, external_resource_id, embed_url,
      storage_path, size_bytes, mime_type, created_at, updated_at
    ) VALUES (
      document_row.workspace_id,
      provider_value,
      CASE WHEN provider_value = 'supabase_storage' THEN 'ready' ELSE 'pending_validation' END,
      CASE WHEN provider_value = 'supabase_storage' THEN NULL ELSE document_row.external_url END,
      CASE WHEN provider_value IN ('youtube', 'google_drive') THEN resource_id_value ELSE NULL END,
      CASE
        WHEN provider_value = 'youtube' THEN 'https://www.youtube-nocookie.com/embed/' || resource_id_value
        ELSE NULL
      END,
      CASE WHEN provider_value = 'supabase_storage' THEN document_row.storage_path ELSE NULL END,
      CASE WHEN provider_value = 'supabase_storage' THEN COALESCE(document_row.size_bytes, 0) ELSE 0 END,
      CASE WHEN provider_value = 'supabase_storage' THEN document_row.mime_type ELSE NULL END,
      COALESCE(document_row.created_at, now()),
      COALESCE(document_row.updated_at, now())
    ) RETURNING id INTO new_asset_id;

    UPDATE public.documentos SET content_asset_id = new_asset_id WHERE id = document_row.id;
  END LOOP;
END;
$$;

UPDATE public.workspace_storage_usage usage
SET used_bytes = usage_totals.used_bytes,
    reserved_bytes = 0,
    version = usage.version + 1,
    updated_at = now()
FROM (
  SELECT workspace_id, COALESCE(sum(size_bytes), 0)::bigint AS used_bytes
  FROM public.content_assets
  WHERE provider = 'supabase_storage' AND status = 'ready'
  GROUP BY workspace_id
) usage_totals
WHERE usage.workspace_id = usage_totals.workspace_id;

DROP TRIGGER IF EXISTS trg_content_assets_updated_at ON public.content_assets;
CREATE TRIGGER trg_content_assets_updated_at
  BEFORE UPDATE ON public.content_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_content_asset_updated_at();
DROP TRIGGER IF EXISTS trg_content_assets_storage_path_immutable ON public.content_assets;
CREATE TRIGGER trg_content_assets_storage_path_immutable
  BEFORE UPDATE ON public.content_assets
  FOR EACH ROW EXECUTE FUNCTION public.prevent_content_asset_path_change();
DROP TRIGGER IF EXISTS trg_documentos_content_asset_workspace ON public.documentos;
CREATE TRIGGER trg_documentos_content_asset_workspace
  BEFORE INSERT OR UPDATE OF content_asset_id, workspace_id ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.assert_document_content_asset_workspace();
DROP TRIGGER IF EXISTS trg_workspaces_storage_defaults ON public.workspaces;
CREATE TRIGGER trg_workspaces_storage_defaults
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.create_workspace_storage_defaults();

ALTER TABLE public.content_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_storage_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_upgrade_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_upgrade_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_assets_workspace_select ON public.content_assets;
CREATE POLICY content_assets_workspace_select ON public.content_assets
  FOR SELECT TO authenticated
  USING (public.is_workspace_storage_reader(workspace_id));
DROP POLICY IF EXISTS content_assets_workspace_insert ON public.content_assets;
CREATE POLICY content_assets_workspace_insert ON public.content_assets
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_storage_writer(workspace_id) AND created_by = auth.uid());
DROP POLICY IF EXISTS content_assets_workspace_update ON public.content_assets;
CREATE POLICY content_assets_workspace_update ON public.content_assets
  FOR UPDATE TO authenticated
  USING (public.is_workspace_storage_writer(workspace_id))
  WITH CHECK (public.is_workspace_storage_writer(workspace_id));

DROP POLICY IF EXISTS workspace_storage_usage_workspace_select ON public.workspace_storage_usage;
CREATE POLICY workspace_storage_usage_workspace_select ON public.workspace_storage_usage
  FOR SELECT TO authenticated
  USING (public.is_workspace_storage_reader(workspace_id));
DROP POLICY IF EXISTS storage_reservations_workspace_select ON public.storage_reservations;
CREATE POLICY storage_reservations_workspace_select ON public.storage_reservations
  FOR SELECT TO authenticated
  USING (public.is_workspace_storage_writer(workspace_id));
DROP POLICY IF EXISTS workspace_entitlements_workspace_select ON public.workspace_entitlements;
CREATE POLICY workspace_entitlements_workspace_select ON public.workspace_entitlements
  FOR SELECT TO authenticated
  USING (public.is_workspace_storage_writer(workspace_id));
DROP POLICY IF EXISTS storage_upgrade_catalog_select ON public.storage_upgrade_catalog;
CREATE POLICY storage_upgrade_catalog_select ON public.storage_upgrade_catalog
  FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS storage_upgrade_requests_workspace_select ON public.storage_upgrade_requests;
CREATE POLICY storage_upgrade_requests_workspace_select ON public.storage_upgrade_requests
  FOR SELECT TO authenticated
  USING (public.is_workspace_storage_writer(workspace_id));
DROP POLICY IF EXISTS storage_upgrade_requests_workspace_insert ON public.storage_upgrade_requests;
CREATE POLICY storage_upgrade_requests_workspace_insert ON public.storage_upgrade_requests
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_storage_writer(workspace_id) AND requested_by = auth.uid());

DROP POLICY IF EXISTS "Documentos: lectura autenticada" ON storage.objects;
DROP POLICY IF EXISTS "Documentos: insert autenticada" ON storage.objects;
DROP POLICY IF EXISTS "Documentos: update autenticada" ON storage.objects;
DROP POLICY IF EXISTS "Documentos: delete autenticada" ON storage.objects;
DROP POLICY IF EXISTS documentos_workspace_select ON storage.objects;
CREATE POLICY documentos_workspace_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos'
    AND EXISTS (
      SELECT 1 FROM public.content_assets asset
      WHERE asset.provider = 'supabase_storage'
        AND asset.storage_path = name
        AND asset.status IN ('reserved', 'uploading', 'processing', 'ready', 'deleting')
        AND public.is_workspace_storage_reader(asset.workspace_id)
    )
  );
DROP POLICY IF EXISTS documentos_workspace_insert ON storage.objects;
CREATE POLICY documentos_workspace_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documentos'
    AND EXISTS (
      SELECT 1 FROM public.content_assets asset
      WHERE asset.provider = 'supabase_storage'
        AND asset.storage_path = name
        AND asset.status IN ('reserved', 'uploading')
        AND public.is_workspace_storage_writer(asset.workspace_id)
        AND (storage.foldername(name))[1] = asset.workspace_id::text
        AND (storage.foldername(name))[2] = asset.id::text
    )
  );
DROP POLICY IF EXISTS documentos_workspace_update ON storage.objects;
CREATE POLICY documentos_workspace_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documentos'
    AND EXISTS (
      SELECT 1 FROM public.content_assets asset
      WHERE asset.provider = 'supabase_storage'
        AND asset.storage_path = name
        AND asset.status IN ('reserved', 'uploading')
        AND public.is_workspace_storage_writer(asset.workspace_id)
    )
  )
  WITH CHECK (
    bucket_id = 'documentos'
    AND EXISTS (
      SELECT 1 FROM public.content_assets asset
      WHERE asset.provider = 'supabase_storage'
        AND asset.storage_path = name
        AND asset.status IN ('reserved', 'uploading')
        AND public.is_workspace_storage_writer(asset.workspace_id)
        AND (storage.foldername(name))[1] = asset.workspace_id::text
        AND (storage.foldername(name))[2] = asset.id::text
    )
  );
DROP POLICY IF EXISTS documentos_workspace_delete ON storage.objects;
CREATE POLICY documentos_workspace_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documentos'
    AND EXISTS (
      SELECT 1 FROM public.content_assets asset
      WHERE asset.provider = 'supabase_storage'
        AND asset.storage_path = name
        AND asset.status = 'deleting'
        AND public.is_workspace_storage_writer(asset.workspace_id)
    )
  );

REVOKE ALL ON TABLE public.content_assets FROM anon, authenticated;
REVOKE ALL ON TABLE public.workspace_storage_usage FROM anon, authenticated;
REVOKE ALL ON TABLE public.storage_reservations FROM anon, authenticated;
REVOKE ALL ON TABLE public.workspace_entitlements FROM anon, authenticated;
REVOKE ALL ON TABLE public.storage_upgrade_catalog FROM anon, authenticated;
REVOKE ALL ON TABLE public.storage_upgrade_requests FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.content_assets TO authenticated;
GRANT SELECT ON TABLE public.workspace_storage_usage TO authenticated;
GRANT SELECT ON TABLE public.storage_reservations TO authenticated;
GRANT SELECT ON TABLE public.workspace_entitlements TO authenticated;
GRANT SELECT ON TABLE public.storage_upgrade_catalog TO authenticated;
GRANT SELECT, INSERT ON TABLE public.storage_upgrade_requests TO authenticated;

REVOKE ALL ON FUNCTION public.ensure_workspace_storage_defaults(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_workspace_storage_defaults() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_content_asset_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_content_asset_path_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assert_document_content_asset_workspace() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_workspace_storage_reader(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_workspace_storage_writer(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_document_upload(uuid, bigint, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_document_upload(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_document_upload(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_document_asset_deleting(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_document_asset_delete(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_workspace_storage_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_document_upload(uuid, bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_storage_reader(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_storage_writer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_document_upload(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_document_upload(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_document_asset_deleting(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_document_asset_delete(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_storage_usage() TO authenticated;

COMMIT;
