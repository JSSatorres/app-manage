BEGIN;

CREATE TEMP TABLE storage_upgrade_test_context (
  workspace_id uuid NOT NULL,
  manager_id uuid NOT NULL,
  member_id uuid NOT NULL,
  active_catalog_id uuid NOT NULL,
  inactive_catalog_id uuid NOT NULL
) ON COMMIT DROP;

INSERT INTO storage_upgrade_test_context VALUES (
  '41000000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000002',
  '71000000-0000-0000-0000-000000000001',
  '71000000-0000-0000-0000-000000000002'
);

INSERT INTO auth.users (id, email)
SELECT manager_id, 'storage-upgrades-manager@test.local' FROM storage_upgrade_test_context
UNION ALL
SELECT member_id, 'storage-upgrades-member@test.local' FROM storage_upgrade_test_context;

INSERT INTO public.workspaces (id, name)
SELECT workspace_id, 'pgTAP storage upgrades' FROM storage_upgrade_test_context;

INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT workspace_id, manager_id, 'gerente_sede' FROM storage_upgrade_test_context
UNION ALL
SELECT workspace_id, member_id, 'entrenador' FROM storage_upgrade_test_context;

INSERT INTO public.storage_upgrade_catalog (
  id, code, name, capacity_bytes, monthly_price_minor, currency_code, sort_order, is_active
)
SELECT active_catalog_id, 'test_upgrade_active_41000000', 'Test +10 GB', 10737418240, 300, 'EUR', 1, true
FROM storage_upgrade_test_context
UNION ALL
SELECT inactive_catalog_id, 'test_upgrade_inactive_41000000', 'Test inactive', 21474836480, 600, 'EUR', 2, false
FROM storage_upgrade_test_context;

CREATE FUNCTION pg_temp.call_upgrade_as(p_user_id uuid, p_workspace_id uuid, p_catalog_item_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    PERFORM public.request_storage_upgrade(p_workspace_id, p_catalog_item_id);
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    RAISE;
  END;
  EXECUTE 'RESET ROLE';
END;
$$;

DO $$
DECLARE
  context storage_upgrade_test_context%ROWTYPE;
  request_count integer;
  stored_price integer;
  stored_capacity bigint;
BEGIN
  SELECT * INTO context FROM storage_upgrade_test_context;
  PERFORM pg_temp.call_upgrade_as(context.manager_id, context.workspace_id, context.active_catalog_id);
  PERFORM pg_temp.call_upgrade_as(context.manager_id, context.workspace_id, context.active_catalog_id);

  SELECT count(*), max(monthly_price_minor), max(requested_capacity_bytes)
  INTO request_count, stored_price, stored_capacity
  FROM public.storage_upgrade_requests
  WHERE workspace_id = context.workspace_id
    AND catalog_item_id = context.active_catalog_id
    AND status = 'pending';

  IF request_count <> 1 OR stored_price <> 300 OR stored_capacity <> 10737418240 THEN
    RAISE EXCEPTION 'la solicitud del gestor debe ser idempotente y conservar el snapshot';
  END IF;
END;
$$;

DO $$
DECLARE
  context storage_upgrade_test_context%ROWTYPE;
  stored_price integer;
BEGIN
  SELECT * INTO context FROM storage_upgrade_test_context;
  UPDATE public.storage_upgrade_catalog
  SET monthly_price_minor = 900
  WHERE id = context.active_catalog_id;

  SELECT monthly_price_minor INTO stored_price
  FROM public.storage_upgrade_requests
  WHERE workspace_id = context.workspace_id
    AND catalog_item_id = context.active_catalog_id
    AND status = 'pending';

  IF stored_price <> 300 THEN
    RAISE EXCEPTION 'un cambio posterior del catÃ¡logo no debe reescribir el snapshot';
  END IF;
END;
$$;

DO $$
DECLARE
  context storage_upgrade_test_context%ROWTYPE;
  inactive_rejected boolean := false;
  non_manager_rejected boolean := false;
BEGIN
  SELECT * INTO context FROM storage_upgrade_test_context;
  BEGIN
    PERFORM pg_temp.call_upgrade_as(context.manager_id, context.workspace_id, context.inactive_catalog_id);
  EXCEPTION WHEN SQLSTATE '22023' THEN
    inactive_rejected := SQLERRM = 'STORAGE_UPGRADE_CATALOG_INACTIVE';
  END;

  BEGIN
    PERFORM pg_temp.call_upgrade_as(context.member_id, context.workspace_id, context.active_catalog_id);
  EXCEPTION WHEN SQLSTATE '42501' THEN
    non_manager_rejected := SQLERRM = 'STORAGE_UPGRADE_NOT_ALLOWED';
  END;

  IF NOT inactive_rejected OR NOT non_manager_rejected THEN
    RAISE EXCEPTION 'el catÃ¡logo inactivo y el no gestor deben ser rechazados por la RPC';
  END IF;
END;
$$;

DO $$
DECLARE
  context storage_upgrade_test_context%ROWTYPE;
  direct_insert_rejected boolean := false;
BEGIN
  SELECT * INTO context FROM storage_upgrade_test_context;
  PERFORM set_config('request.jwt.claim.sub', context.manager_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    INSERT INTO public.storage_upgrade_requests (
      workspace_id, catalog_item_id, requested_capacity_bytes, monthly_price_minor, currency_code, requested_by
    ) VALUES (
      context.workspace_id, context.active_catalog_id, 1, 1, 'EUR', context.manager_id
    );
  EXCEPTION WHEN SQLSTATE '42501' THEN
    direct_insert_rejected := true;
  END;
  EXECUTE 'RESET ROLE';

  IF NOT direct_insert_rejected THEN
    RAISE EXCEPTION 'el INSERT directo debe seguir denegado a authenticated';
  END IF;
END;
$$;

DO $$
DECLARE
  context storage_upgrade_test_context%ROWTYPE;
  unique_index_exists boolean;
  duplicate_rejected boolean := false;
BEGIN
  SELECT * INTO context FROM storage_upgrade_test_context;
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'storage_upgrade_requests'
      AND indexname = 'storage_upgrade_requests_pending_unique'
      AND indexdef LIKE '%UNIQUE%'
      AND indexdef LIKE '%WHERE (status = ''pending''::text)%'
  ) INTO unique_index_exists;

  BEGIN
    INSERT INTO public.storage_upgrade_requests (
      workspace_id, catalog_item_id, requested_capacity_bytes, monthly_price_minor, currency_code, requested_by
    ) VALUES (
      context.workspace_id, context.active_catalog_id, 10737418240, 300, 'EUR', context.manager_id
    );
  EXCEPTION WHEN unique_violation THEN
    duplicate_rejected := true;
  END;

  IF NOT unique_index_exists OR NOT duplicate_rejected OR (
    SELECT count(*)
    FROM public.storage_upgrade_requests
    WHERE workspace_id = context.workspace_id
      AND catalog_item_id = context.active_catalog_id
      AND status = 'pending'
  ) <> 1 THEN
    RAISE EXCEPTION 'el Ã­ndice parcial debe impedir duplicados pendientes incluso bajo carrera';
  END IF;
END;
$$;

ROLLBACK;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM auth.users
    WHERE email IN ('storage-upgrades-manager@test.local', 'storage-upgrades-member@test.local')
  ) THEN
    RAISE EXCEPTION 'el rollback debe limpiar los fixtures de storage upgrades';
  END IF;
END;
$$;
