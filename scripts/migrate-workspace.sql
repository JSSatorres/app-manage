-- =============================================================
-- MIGRACIÓN: Sistema workspace-first
-- Elimina la dependencia de usuarios.sede_id y usuarios.rol
-- Todo el acceso se basa en workspace_members
-- =============================================================

-- 1. Asegurar que workspace_members tiene índice único para ON CONFLICT
ALTER TABLE public.workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_pkey;
ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_pkey PRIMARY KEY (workspace_id, user_id);

-- 2. Nueva RPC: sync_auth_profile (simplificada, sin rol ni sede_id)
--    Solo garantiza que el usuario existe en public.usuarios
CREATE OR REPLACE FUNCTION public.sync_auth_profile(p_full_name text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nombre, rol, created_at, updated_at)
  VALUES (
    auth.uid(),
    auth.email(),
    COALESCE(p_full_name, split_part(auth.email(), '@', 1)),
    'AdminSede',  -- valor legacy, se ignora en la nueva lógica
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
    SET email      = EXCLUDED.email,
        nombre     = COALESCE(EXCLUDED.nombre, usuarios.nombre),
        updated_at = now();
END;
$$;

-- 3. Nueva RPC: setup_workspace
--    Crea workspace + sede + workspace_member para usuarios nuevos sin workspace
CREATE OR REPLACE FUNCTION public.setup_workspace(p_club_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_sede_id      uuid;
BEGIN
  -- Si ya tiene workspace, devolver el existente sin error
  SELECT wm.workspace_id INTO v_workspace_id
  FROM public.workspace_members wm
  WHERE wm.user_id = auth.uid()
  LIMIT 1;

  IF v_workspace_id IS NOT NULL THEN
    SELECT id INTO v_sede_id
    FROM public.sedes
    WHERE workspace_id = v_workspace_id
    LIMIT 1;

    RETURN json_build_object(
      'workspace_id', v_workspace_id,
      'sede_id', v_sede_id
    );
  END IF;

  -- Crear workspace
  INSERT INTO public.workspaces (name, created_at, updated_at)
  VALUES (p_club_name, now(), now())
  RETURNING id INTO v_workspace_id;

  -- Crear sede por defecto
  INSERT INTO public.sedes (nombre, workspace_id, configuracion_visual, created_at, updated_at)
  VALUES ('Mi sede', v_workspace_id, '{}'::jsonb, now(), now())
  RETURNING id INTO v_sede_id;

  -- Registrar al usuario como admin del workspace
  INSERT INTO public.workspace_members (workspace_id, user_id, role, created_at)
  VALUES (v_workspace_id, auth.uid(), 'admin', now());

  RETURN json_build_object(
    'workspace_id', v_workspace_id,
    'sede_id', v_sede_id
  );
END;
$$;

-- 4. RLS: workspace_members — sin recursión
DROP POLICY IF EXISTS workspace_members_select ON public.workspace_members;
CREATE POLICY workspace_members_select ON public.workspace_members
  FOR SELECT USING (user_id = auth.uid());

-- Permitir INSERT al propio usuario (para setup_workspace vía SECURITY DEFINER no lo necesita,
-- pero lo dejamos por si se inserta directamente)
DROP POLICY IF EXISTS workspace_members_insert ON public.workspace_members;
CREATE POLICY workspace_members_insert ON public.workspace_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 5. RLS: workspaces — el usuario ve los workspaces donde es miembro
DROP POLICY IF EXISTS workspaces_select ON public.workspaces;
CREATE POLICY workspaces_select ON public.workspaces
  FOR SELECT USING (
    id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

-- 6. RLS: sedes — el usuario ve las sedes de sus workspaces
DROP POLICY IF EXISTS sedes_select ON public.sedes;
CREATE POLICY sedes_select ON public.sedes
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS sedes_insert ON public.sedes;
CREATE POLICY sedes_insert ON public.sedes
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS sedes_update ON public.sedes;
CREATE POLICY sedes_update ON public.sedes
  FOR UPDATE USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS sedes_delete ON public.sedes;
CREATE POLICY sedes_delete ON public.sedes
  FOR DELETE USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS sedes_mutate ON public.sedes;

-- 7. RLS: equipos — vía sede → workspace
DROP POLICY IF EXISTS equipos_select ON public.equipos;
CREATE POLICY equipos_select ON public.equipos
  FOR SELECT USING (
    sede_id IN (
      SELECT s.id FROM public.sedes s
      JOIN public.workspace_members wm ON wm.workspace_id = s.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS equipos_mutate ON public.equipos;
CREATE POLICY equipos_mutate ON public.equipos
  FOR ALL USING (
    sede_id IN (
      SELECT s.id FROM public.sedes s
      JOIN public.workspace_members wm ON wm.workspace_id = s.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

-- 8. RLS: sesiones — vía equipo → sede → workspace
DROP POLICY IF EXISTS sesiones_select ON public.sesiones;
CREATE POLICY sesiones_select ON public.sesiones
  FOR SELECT USING (
    equipo_id IN (
      SELECT e.id FROM public.equipos e
      JOIN public.sedes s ON s.id = e.sede_id
      JOIN public.workspace_members wm ON wm.workspace_id = s.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS sesiones_mutate ON public.sesiones;
CREATE POLICY sesiones_mutate ON public.sesiones
  FOR ALL USING (
    equipo_id IN (
      SELECT e.id FROM public.equipos e
      JOIN public.sedes s ON s.id = e.sede_id
      JOIN public.workspace_members wm ON wm.workspace_id = s.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS allow_all_sesiones ON public.sesiones;

-- 9. RLS: ejercicios — globales o de sede del workspace
DROP POLICY IF EXISTS ejercicios_select ON public.ejercicios;
CREATE POLICY ejercicios_select ON public.ejercicios
  FOR SELECT USING (
    es_global = true
    OR sede_propietaria_id IN (
      SELECT s.id FROM public.sedes s
      JOIN public.workspace_members wm ON wm.workspace_id = s.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS ejercicios_mutate ON public.ejercicios;
CREATE POLICY ejercicios_mutate ON public.ejercicios
  FOR ALL USING (
    sede_propietaria_id IN (
      SELECT s.id FROM public.sedes s
      JOIN public.workspace_members wm ON wm.workspace_id = s.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS allow_all_ejercicios ON public.ejercicios;

-- 10. RLS: documentos — de sede del workspace
DROP POLICY IF EXISTS documentos_select ON public.documentos;
CREATE POLICY documentos_select ON public.documentos
  FOR SELECT USING (
    sede_id IN (
      SELECT s.id FROM public.sedes s
      JOIN public.workspace_members wm ON wm.workspace_id = s.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS documentos_mutate ON public.documentos;
CREATE POLICY documentos_mutate ON public.documentos
  FOR ALL USING (
    sede_id IN (
      SELECT s.id FROM public.sedes s
      JOIN public.workspace_members wm ON wm.workspace_id = s.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS allow_all_documentos ON public.documentos;

-- 11. RLS: parametros_sistema — globales (sede_id IS NULL) o de sede del workspace
DROP POLICY IF EXISTS parametros_select ON public.parametros_sistema;
CREATE POLICY parametros_select ON public.parametros_sistema
  FOR SELECT USING (
    sede_id IS NULL
    OR sede_id IN (
      SELECT s.id FROM public.sedes s
      JOIN public.workspace_members wm ON wm.workspace_id = s.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS parametros_mutate ON public.parametros_sistema;
CREATE POLICY parametros_mutate ON public.parametros_sistema
  FOR ALL USING (
    sede_id IS NULL
    OR sede_id IN (
      SELECT s.id FROM public.sedes s
      JOIN public.workspace_members wm ON wm.workspace_id = s.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS allow_all_parametros ON public.parametros_sistema;

-- 12. RLS: usuarios — ve los usuarios de sus workspaces (vía sedes)
DROP POLICY IF EXISTS usuarios_select ON public.usuarios;
CREATE POLICY usuarios_select ON public.usuarios
  FOR SELECT USING (
    id = auth.uid()
    OR id IN (
      SELECT DISTINCT wm2.user_id
      FROM public.workspace_members wm2
      WHERE wm2.workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS allow_all_usuarios ON public.usuarios;

-- 13. workspaces: permitir INSERT desde setup_workspace (SECURITY DEFINER lo bypasea, pero por si acaso)
DROP POLICY IF EXISTS workspaces_insert ON public.workspaces;
CREATE POLICY workspaces_insert ON public.workspaces
  FOR INSERT WITH CHECK (true);

-- 14. Asegurar RLS habilitado en workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
