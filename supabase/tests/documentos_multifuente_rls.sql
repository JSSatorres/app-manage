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

-- Los UUID fijos solo existen dentro de esta transacción y hacen reproducible el
-- contexto JWT de cada comprobación.
CREATE TEMP TABLE documentos_rls_context (
  workspace_a uuid NOT NULL,
  workspace_b uuid NOT NULL,
  gerente_id uuid NOT NULL,
  entrenador_id uuid NOT NULL,
  ajeno_id uuid NOT NULL,
  asset_a_id uuid NOT NULL,
  asset_b_id uuid NOT NULL,
  asset_mutable_id uuid NOT NULL
) ON COMMIT DROP;

INSERT INTO documentos_rls_context VALUES (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000003'
);

INSERT INTO auth.users (id, email)
SELECT user_id, email
FROM (
  SELECT gerente_id AS user_id, 'documentos-rls-gerente@test.local' AS email FROM documentos_rls_context
  UNION ALL
  SELECT entrenador_id, 'documentos-rls-entrenador@test.local' FROM documentos_rls_context
  UNION ALL
  SELECT ajeno_id, 'documentos-rls-ajeno@test.local' FROM documentos_rls_context
) users;

INSERT INTO public.workspaces (id, name)
SELECT workspace_a, 'pgTAP documentos A' FROM documentos_rls_context
UNION ALL
SELECT workspace_b, 'pgTAP documentos B' FROM documentos_rls_context;

INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT workspace_a, gerente_id, 'gerente_sede' FROM documentos_rls_context
UNION ALL
SELECT workspace_a, entrenador_id, 'entrenador' FROM documentos_rls_context;

INSERT INTO public.content_assets (
  id, workspace_id, provider, status, storage_path, size_bytes, created_by
)
SELECT asset_a_id, workspace_a, 'supabase_storage', 'ready',
       workspace_a::text || '/' || asset_a_id::text || '/ready', 10, gerente_id
FROM documentos_rls_context
UNION ALL
SELECT asset_b_id, workspace_b, 'supabase_storage', 'ready',
       workspace_b::text || '/' || asset_b_id::text || '/ready', 10, ajeno_id
FROM documentos_rls_context
UNION ALL
SELECT asset_mutable_id, workspace_a, 'supabase_storage', 'reserved',
       workspace_a::text || '/' || asset_mutable_id::text || '/reserved', 10, gerente_id
FROM documentos_rls_context;

INSERT INTO public.workspace_storage_usage (workspace_id, used_bytes, reserved_bytes, limit_bytes)
SELECT workspace_a, 10, 10, 100 FROM documentos_rls_context
UNION ALL
SELECT workspace_b, 10, 0, 100 FROM documentos_rls_context
ON CONFLICT (workspace_id) DO UPDATE
SET used_bytes = EXCLUDED.used_bytes,
    reserved_bytes = EXCLUDED.reserved_bytes,
    limit_bytes = EXCLUDED.limit_bytes;

INSERT INTO public.workspace_entitlements (
  workspace_id, entitlement_key, capacity_bytes, status, source
)
SELECT workspace_a, 'pg_tap_rls_a', 100, 'active', 'manual' FROM documentos_rls_context
UNION ALL
SELECT workspace_b, 'pg_tap_rls_b', 100, 'active', 'manual' FROM documentos_rls_context;

INSERT INTO storage.objects (bucket_id, name, metadata)
SELECT 'documentos', workspace_a::text || '/' || asset_a_id::text || '/ready', '{"size":"10"}'::jsonb
FROM documentos_rls_context;

CREATE FUNCTION pg_temp.assert_sql_as(
  p_user_id uuid,
  p_sql text,
  p_should_succeed boolean,
  p_label text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  did_succeed boolean := true;
  failure_message text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    did_succeed := false;
    failure_message := SQLERRM;
  END;
  EXECUTE 'RESET ROLE';

  IF did_succeed IS DISTINCT FROM p_should_succeed THEN
    RAISE EXCEPTION '%: expected success %, got success % (%)',
      p_label, p_should_succeed, did_succeed, COALESCE(failure_message, 'no error');
  END IF;
END;
$$;

CREATE FUNCTION pg_temp.assert_boolean_as(
  p_user_id uuid,
  p_sql text,
  p_expected boolean,
  p_label text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  actual boolean;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    EXECUTE p_sql INTO actual;
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    RAISE;
  END;
  EXECUTE 'RESET ROLE';

  IF actual IS DISTINCT FROM p_expected THEN
    RAISE EXCEPTION '%: expected %, got %', p_label, p_expected, actual;
  END IF;
END;
$$;

DO $$
DECLARE
  context documentos_rls_context%ROWTYPE;
BEGIN
  SELECT * INTO context FROM documentos_rls_context;

  PERFORM pg_temp.assert_boolean_as(
    context.gerente_id,
    format('SELECT EXISTS (SELECT 1 FROM public.content_assets WHERE id = %L::uuid)', context.asset_a_id),
    true,
    'el gerente puede leer assets de su workspace'
  );
  PERFORM pg_temp.assert_boolean_as(
    context.gerente_id,
    format('SELECT EXISTS (SELECT 1 FROM public.content_assets WHERE id = %L::uuid)', context.asset_b_id),
    false,
    'el gerente no puede leer assets de otro workspace'
  );
  PERFORM pg_temp.assert_boolean_as(
    context.entrenador_id,
    format('SELECT EXISTS (SELECT 1 FROM public.content_assets WHERE id = %L::uuid)', context.asset_a_id),
    true,
    'el entrenador conserva lectura de su workspace'
  );
  PERFORM pg_temp.assert_boolean_as(
    context.ajeno_id,
    format('SELECT EXISTS (SELECT 1 FROM public.content_assets WHERE id = %L::uuid)', context.asset_a_id),
    false,
    'el usuario ajeno no puede leer assets'
  );
END;
$$;
SELECT pg_temp.pass('SELECT queda aislado por workspace y conserva la lectura del entrenador');

DO $$
DECLARE
  context documentos_rls_context%ROWTYPE;
BEGIN
  SELECT * INTO context FROM documentos_rls_context;

  PERFORM pg_temp.assert_boolean_as(
    context.gerente_id,
    format($sql$
      WITH inserted AS (
        INSERT INTO public.content_assets (workspace_id, provider, status, original_url, size_bytes, created_by)
        VALUES (%1$L::uuid, 'external_legacy', 'pending_validation', 'https://test.local/own', 0, auth.uid())
        RETURNING id
      )
      SELECT EXISTS (SELECT 1 FROM inserted)
    $sql$, context.workspace_a),
    true,
    'el gerente puede insertar un asset propio'
  );
  PERFORM pg_temp.assert_sql_as(
    context.gerente_id,
    format($sql$
      INSERT INTO public.content_assets (workspace_id, provider, status, original_url, size_bytes, created_by)
      VALUES (%1$L::uuid, 'external_legacy', 'pending_validation', 'https://test.local/cross', 0, auth.uid())
    $sql$, context.workspace_b),
    false,
    'el gerente no puede insertar en otro workspace'
  );
  PERFORM pg_temp.assert_boolean_as(
    context.gerente_id,
    format($sql$
      WITH updated AS (
        UPDATE public.content_assets SET mime_type = 'text/plain' WHERE id = %1$L::uuid RETURNING id
      )
      SELECT EXISTS (SELECT 1 FROM updated)
    $sql$, context.asset_a_id),
    true,
    'el gerente puede actualizar un asset propio'
  );
  PERFORM pg_temp.assert_boolean_as(
    context.gerente_id,
    format($sql$
      WITH updated AS (
        UPDATE public.content_assets SET mime_type = 'text/plain' WHERE id = %1$L::uuid RETURNING id
      )
      SELECT EXISTS (SELECT 1 FROM updated)
    $sql$, context.asset_b_id),
    false,
    'el gerente no puede actualizar un asset ajeno'
  );
  PERFORM pg_temp.assert_sql_as(
    context.gerente_id,
    format($sql$
      DELETE FROM public.content_assets WHERE id = %1$L::uuid
    $sql$, context.asset_b_id),
    false,
    'el gerente no puede borrar un asset ajeno'
  );
END;
$$;
SELECT pg_temp.pass('INSERT, UPDATE y DELETE directos respetan el tenant');

DO $$
DECLARE
  context documentos_rls_context%ROWTYPE;
BEGIN
  SELECT * INTO context FROM documentos_rls_context;

  PERFORM pg_temp.assert_sql_as(
    context.gerente_id,
    format($sql$
      UPDATE public.content_assets
      SET storage_path = 'manipulado'
      WHERE id = %1$L::uuid
    $sql$, context.asset_mutable_id),
    false,
    'storage_path es inmutable'
  );
  PERFORM pg_temp.assert_boolean_as(
    context.entrenador_id,
    format('SELECT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = ''documentos'' AND name = %L)',
      context.workspace_a::text || '/' || context.asset_a_id::text || '/ready'),
    true,
    'el entrenador puede leer el objeto autorizado'
  );
  PERFORM pg_temp.assert_sql_as(
    context.gerente_id,
    format($sql$
      INSERT INTO storage.objects (bucket_id, name, metadata)
      VALUES ('documentos', %1$L, '{"size":"10"}'::jsonb)
    $sql$, context.workspace_a::text || '/' || context.asset_mutable_id::text || '/manipulado'),
    false,
    'Storage rechaza un path que no coincide con la reserva'
  );
END;
$$;
SELECT pg_temp.pass('el path inmutable y la policy de Storage evitan manipulaciones');

DO $$
DECLARE
  context documentos_rls_context%ROWTYPE;
BEGIN
  SELECT * INTO context FROM documentos_rls_context;

  PERFORM pg_temp.assert_boolean_as(
    context.gerente_id,
    format('SELECT EXISTS (SELECT 1 FROM public.workspace_storage_usage WHERE workspace_id = %L::uuid)', context.workspace_a),
    true,
    'el gerente puede consultar usage propio'
  );
  PERFORM pg_temp.assert_boolean_as(
    context.entrenador_id,
    format('SELECT EXISTS (SELECT 1 FROM public.workspace_storage_usage WHERE workspace_id = %L::uuid)', context.workspace_a),
    true,
    'el entrenador puede consultar usage de solo lectura'
  );
  PERFORM pg_temp.assert_boolean_as(
    context.entrenador_id,
    format('SELECT EXISTS (SELECT 1 FROM public.workspace_entitlements WHERE workspace_id = %L::uuid)', context.workspace_a),
    false,
    'el entrenador no puede consultar entitlements de gestión'
  );
  PERFORM pg_temp.assert_boolean_as(
    context.ajeno_id,
    format('SELECT EXISTS (SELECT 1 FROM public.workspace_storage_usage WHERE workspace_id = %L::uuid)', context.workspace_a),
    false,
    'el usuario ajeno no puede consultar usage'
  );
END;
$$;
SELECT pg_temp.pass('usage y entitlements mantienen las lecturas y el rol de solo lectura');

SELECT pg_temp.ok(
  has_table_privilege('authenticated', 'public.content_assets', 'SELECT, INSERT, UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.content_assets', 'DELETE')
  AND has_table_privilege('authenticated', 'public.workspace_storage_usage', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.workspace_storage_usage', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.workspace_entitlements', 'INSERT')
  AND has_function_privilege('authenticated', 'public.reserve_document_upload(uuid, bigint, text)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.reserve_document_upload(uuid, bigint, text)', 'EXECUTE'),
  'los grants directos exponen solo las operaciones autorizadas'
);

SELECT * FROM pg_temp.finish();
ROLLBACK;
