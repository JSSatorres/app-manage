BEGIN;

-- El adaptador temporal conserva el contrato TAP y permite ejecutar las mismas
-- aserciones por Management API cuando el remoto de pruebas no tiene pgTAP.
CREATE TEMP TABLE documentos_pgtap_fallback (id boolean) ON COMMIT DROP;
DO $$
BEGIN
    EXECUTE $create$
      CREATE FUNCTION pg_temp.plan(p_count integer) RETURNS text LANGUAGE sql AS $body$
        SELECT format('1..%s', p_count)
      $body$
    $create$;
    EXECUTE $create$
      CREATE FUNCTION pg_temp.pass(p_description text) RETURNS text LANGUAGE sql AS $body$
        SELECT 'ok - ' || p_description
      $body$
    $create$;
    EXECUTE $create$
      CREATE FUNCTION pg_temp.ok(p_condition boolean, p_description text) RETURNS text LANGUAGE plpgsql AS $body$
      BEGIN
        IF NOT p_condition THEN
          RAISE EXCEPTION '%', p_description;
        END IF;
        RETURN 'ok - ' || p_description;
      END;
      $body$
    $create$;
    EXECUTE $create$
      CREATE FUNCTION pg_temp.finish() RETURNS TABLE (result text) LANGUAGE sql AS $body$
        SELECT 'finish'
      $body$
    $create$;
END;
$$;

SELECT pg_temp.plan(5);

CREATE TEMP TABLE documentos_quota_context (
  workspace_id uuid NOT NULL,
  gerente_id uuid NOT NULL,
  documento_a_id uuid NOT NULL,
  documento_b_id uuid NOT NULL,
  documento_c_id uuid NOT NULL,
  documento_d_id uuid NOT NULL
) ON COMMIT DROP;

INSERT INTO documentos_quota_context VALUES (
  '40000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000002',
  '60000000-0000-0000-0000-000000000003',
  '60000000-0000-0000-0000-000000000004'
);

INSERT INTO auth.users (id, email)
SELECT gerente_id, 'documentos-quota-gerente@test.local' FROM documentos_quota_context;

INSERT INTO public.workspaces (id, name)
SELECT workspace_id, 'pgTAP cuota documentos' FROM documentos_quota_context;

INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT workspace_id, gerente_id, 'gerente_sede' FROM documentos_quota_context;

INSERT INTO public.documentos (id, titulo, workspace_id)
SELECT documento_a_id, 'Reserva uno', workspace_id FROM documentos_quota_context
UNION ALL
SELECT documento_b_id, 'Reserva dos', workspace_id FROM documentos_quota_context
UNION ALL
SELECT documento_c_id, 'Reserva expiración', workspace_id FROM documentos_quota_context
UNION ALL
SELECT documento_d_id, 'Reserva rollback', workspace_id FROM documentos_quota_context;

UPDATE public.workspace_storage_usage usage
SET used_bytes = 0, reserved_bytes = 0, limit_bytes = 100, version = 0
FROM documentos_quota_context context
WHERE usage.workspace_id = context.workspace_id;

CREATE FUNCTION pg_temp.call_as_gerente(p_user_id uuid, p_sql text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    RAISE;
  END;
  EXECUTE 'RESET ROLE';
END;
$$;

CREATE FUNCTION pg_temp.reserve_as_gerente(p_user_id uuid, p_documento_id uuid, p_size bigint)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  asset_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    SELECT reserved.asset_id INTO asset_id
    FROM public.reserve_document_upload(p_documento_id, p_size, 'application/pdf') reserved;
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    RAISE;
  END;
  EXECUTE 'RESET ROLE';
  RETURN asset_id;
END;
$$;

DO $$
DECLARE
  context documentos_quota_context%ROWTYPE;
  first_asset uuid;
  second_reservation_failed boolean := false;
  current_reserved_bytes bigint;
BEGIN
  SELECT * INTO context FROM documentos_quota_context;
  first_asset := pg_temp.reserve_as_gerente(context.gerente_id, context.documento_a_id, 60);

  BEGIN
    PERFORM pg_temp.reserve_as_gerente(context.gerente_id, context.documento_b_id, 60);
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    second_reservation_failed := SQLERRM = 'QUOTA_EXCEEDED';
  END;

  SELECT usage.reserved_bytes INTO current_reserved_bytes
  FROM public.workspace_storage_usage AS usage
  WHERE usage.workspace_id = context.workspace_id;

  IF first_asset IS NULL OR NOT second_reservation_failed OR current_reserved_bytes <> 60 THEN
    RAISE EXCEPTION 'la reserva serializada debe confirmar exactamente una solicitud (asset %, error %, reservado %)',
      first_asset, second_reservation_failed, current_reserved_bytes;
  END IF;
END;
$$;
SELECT pg_temp.pass('el bloqueo de usage impide que dos reservas serializadas superen el límite');

DO $$
DECLARE
  context documentos_quota_context%ROWTYPE;
  expired_asset uuid;
  fresh_asset uuid;
  current_reserved_bytes bigint;
  expired_count integer;
BEGIN
  SELECT * INTO context FROM documentos_quota_context;
  expired_asset := pg_temp.reserve_as_gerente(context.gerente_id, context.documento_c_id, 30);
  UPDATE public.storage_reservations SET expires_at = now() - interval '1 second' WHERE asset_id = expired_asset;
  fresh_asset := pg_temp.reserve_as_gerente(context.gerente_id, context.documento_b_id, 20);

  SELECT usage.reserved_bytes INTO current_reserved_bytes
  FROM public.workspace_storage_usage AS usage
  WHERE usage.workspace_id = context.workspace_id;
  SELECT count(*) INTO expired_count
  FROM public.storage_reservations
  WHERE asset_id = expired_asset AND status = 'expired';

  IF fresh_asset IS NULL OR expired_count <> 1 OR current_reserved_bytes <> 80 THEN
    RAISE EXCEPTION 'la expiración debe liberar una sola reserva (asset %, expiradas %, reservado %)',
      fresh_asset, expired_count, current_reserved_bytes;
  END IF;
END;
$$;
SELECT pg_temp.pass('una reserva expirada se libera antes de aceptar otra');

DO $$
DECLARE
  context documentos_quota_context%ROWTYPE;
  cancel_asset uuid;
  first_result public.content_assets;
  second_result public.content_assets;
  reserved_after_first bigint;
  reserved_after_second bigint;
BEGIN
  SELECT * INTO context FROM documentos_quota_context;
  cancel_asset := pg_temp.reserve_as_gerente(context.gerente_id, context.documento_d_id, 10);

  PERFORM pg_temp.call_as_gerente(context.gerente_id,
    format('SELECT public.cancel_document_upload(%L::uuid)', cancel_asset));
  SELECT reserved_bytes INTO reserved_after_first FROM public.workspace_storage_usage WHERE workspace_id = context.workspace_id;
  SELECT * INTO first_result FROM public.content_assets WHERE id = cancel_asset;

  PERFORM pg_temp.call_as_gerente(context.gerente_id,
    format('SELECT public.cancel_document_upload(%L::uuid)', cancel_asset));
  SELECT reserved_bytes INTO reserved_after_second FROM public.workspace_storage_usage WHERE workspace_id = context.workspace_id;
  SELECT * INTO second_result FROM public.content_assets WHERE id = cancel_asset;

  IF first_result.status <> 'failed' OR second_result.status <> 'failed'
     OR reserved_after_first <> reserved_after_second THEN
    RAISE EXCEPTION 'cancel debe ser idempotente y descontar una sola vez';
  END IF;
END;
$$;
SELECT pg_temp.pass('cancel libera una única vez y es idempotente');

DO $$
DECLARE
  context documentos_quota_context%ROWTYPE;
  ready_asset uuid;
  ready_path text;
  used_after_first bigint;
  used_after_second bigint;
BEGIN
  SELECT * INTO context FROM documentos_quota_context;
  ready_asset := pg_temp.reserve_as_gerente(context.gerente_id, context.documento_d_id, 10);
  SELECT storage_path INTO ready_path FROM public.content_assets WHERE id = ready_asset;
  INSERT INTO storage.objects (bucket_id, name, metadata)
  VALUES ('documentos', ready_path, '{"size":"10"}'::jsonb);

  PERFORM pg_temp.call_as_gerente(context.gerente_id,
    format('SELECT public.complete_document_upload(%L::uuid)', ready_asset));
  SELECT used_bytes INTO used_after_first FROM public.workspace_storage_usage WHERE workspace_id = context.workspace_id;

  PERFORM pg_temp.call_as_gerente(context.gerente_id,
    format('SELECT public.complete_document_upload(%L::uuid)', ready_asset));
  SELECT used_bytes INTO used_after_second FROM public.workspace_storage_usage WHERE workspace_id = context.workspace_id;

  IF used_after_first <> used_after_second
     OR NOT EXISTS (SELECT 1 FROM public.content_assets WHERE id = ready_asset AND status = 'ready') THEN
    RAISE EXCEPTION 'complete debe ser idempotente';
  END IF;
END;
$$;
SELECT pg_temp.pass('complete contabiliza una vez cuando el objeto existe');

DO $$
DECLARE
  context documentos_quota_context%ROWTYPE;
  missing_asset uuid;
  deleted_asset uuid;
  reserved_before bigint;
  reserved_after bigint;
  used_before_delete bigint;
  used_after_first_delete bigint;
  used_after_second_delete bigint;
  missing_failed boolean := false;
BEGIN
  SELECT * INTO context FROM documentos_quota_context;
  missing_asset := pg_temp.reserve_as_gerente(context.gerente_id, context.documento_c_id, 5);
  SELECT reserved_bytes INTO reserved_before FROM public.workspace_storage_usage WHERE workspace_id = context.workspace_id;

  BEGIN
    PERFORM pg_temp.call_as_gerente(context.gerente_id,
      format('SELECT public.complete_document_upload(%L::uuid)', missing_asset));
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    missing_failed := SQLERRM = 'UPLOAD_OBJECT_MISSING';
  END;

  SELECT reserved_bytes INTO reserved_after FROM public.workspace_storage_usage WHERE workspace_id = context.workspace_id;
  IF NOT missing_failed OR reserved_before <> reserved_after
     OR NOT EXISTS (SELECT 1 FROM public.storage_reservations WHERE asset_id = missing_asset AND status = 'reserved') THEN
    RAISE EXCEPTION 'complete sin objeto debe hacer rollback completo';
  END IF;

  SELECT content_asset_id INTO deleted_asset
  FROM public.documentos
  WHERE id = context.documento_d_id;
  SELECT used_bytes INTO used_before_delete FROM public.workspace_storage_usage WHERE workspace_id = context.workspace_id;
  PERFORM pg_temp.call_as_gerente(context.gerente_id,
    format('SELECT public.mark_document_asset_deleting(%L::uuid)', deleted_asset));
  PERFORM pg_temp.call_as_gerente(context.gerente_id,
    format('SELECT public.complete_document_asset_delete(%L::uuid)', deleted_asset));
  SELECT used_bytes INTO used_after_first_delete FROM public.workspace_storage_usage WHERE workspace_id = context.workspace_id;
  PERFORM pg_temp.call_as_gerente(context.gerente_id,
    format('SELECT public.complete_document_asset_delete(%L::uuid)', deleted_asset));
  SELECT used_bytes INTO used_after_second_delete FROM public.workspace_storage_usage WHERE workspace_id = context.workspace_id;

  IF used_after_first_delete <> used_before_delete - 10
     OR used_after_second_delete <> used_after_first_delete
     OR NOT EXISTS (SELECT 1 FROM public.content_assets WHERE id = deleted_asset AND status = 'deleted') THEN
    RAISE EXCEPTION 'complete delete debe decrementar usage una única vez';
  END IF;
END;
$$;
SELECT pg_temp.pass('complete sin objeto revierte y el borrado descuenta una sola vez');

SELECT * FROM pg_temp.finish();
ROLLBACK;
