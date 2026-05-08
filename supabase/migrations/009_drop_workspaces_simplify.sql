BEGIN;

-- ============================================================
-- MIGRACIÓN 009: Eliminar workspaces y simplificar a sede_id
-- ============================================================
-- El modelo nuevo es:
--   SuperAdmin  → ve todo (sin filtro de sede)
--   AdminSede   → gestiona su propia sede (sede_id en usuarios)
--   Entrenador  → pertenece a una sede
--   Jugador     → pertenece a una sede
--
-- La columna usuarios.sede_id ya existía desde el schema inicial.
-- Solo eliminamos las tablas de workspaces y reescribimos las RLS.
-- ============================================================

-- 1. Eliminar tablas de workspaces (en orden por FK)
DROP TABLE IF EXISTS public.workspace_invitations CASCADE;
DROP TABLE IF EXISTS public.workspace_members CASCADE;
DROP TABLE IF EXISTS public.superadmins CASCADE;

-- 2. Quitar columnas workspace_id de tablas que las tenían
ALTER TABLE public.sedes              DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.parametros_sistema DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.ejercicios         DROP COLUMN IF EXISTS workspace_id;

-- 3. Eliminar tabla workspaces (ya sin referencias)
DROP TABLE IF EXISTS public.workspaces CASCADE;

-- 4. Quitar funciones que dependían de workspaces
DROP FUNCTION IF EXISTS public.setup_user_workspaces() CASCADE;
DROP FUNCTION IF EXISTS public.create_workspace_invitation(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.accept_workspace_invitation(text) CASCADE;
DROP FUNCTION IF EXISTS public.sync_rol_from_workspace_member() CASCADE;

-- 5. Función sync_auth_profile: crear/actualizar perfil en usuarios
--    El rol por defecto al registrarse es AdminSede.
--    Si ya tiene un rol asignado, no lo sobreescribe.
CREATE OR REPLACE FUNCTION public.sync_auth_profile(p_full_name text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_name  text;
  v_uid   uuid;
BEGIN
  v_uid   := auth.uid();
  v_email := auth.jwt() ->> 'email';
  IF v_email IS NULL OR length(trim(v_email)) = 0 THEN
    RAISE EXCEPTION 'missing email in token';
  END IF;
  v_name := coalesce(nullif(trim(p_full_name), ''), split_part(v_email, '@', 1));

  INSERT INTO public.usuarios (id, email, nombre, rol, sede_id)
  VALUES (v_uid, v_email, v_name, 'AdminSede', NULL)
  ON CONFLICT (id) DO UPDATE
    SET email  = EXCLUDED.email,
        nombre = coalesce(EXCLUDED.nombre, public.usuarios.nombre);
END;
$$;

-- 6. Función setup_user_sede: crea la sede por defecto para un AdminSede nuevo
--    Solo actúa si el usuario aún no tiene sede asignada.
CREATE OR REPLACE FUNCTION public.setup_user_sede()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    uuid;
  v_rol    text;
  v_sede   uuid;
BEGIN
  v_uid := auth.uid();

  SELECT rol, sede_id INTO v_rol, v_sede
  FROM public.usuarios
  WHERE id = v_uid;

  -- SuperAdmin no necesita sede propia
  IF v_rol = 'SuperAdmin' THEN RETURN; END IF;

  -- Si ya tiene sede, no hace nada
  IF v_sede IS NOT NULL THEN RETURN; END IF;

  -- Crear sede y asignarla al admin
  INSERT INTO public.sedes (nombre, direccion, configuracion_visual, responsable_id)
  VALUES ('Mi sede', '', '{}'::jsonb, v_uid)
  RETURNING id INTO v_sede;

  UPDATE public.usuarios
  SET sede_id = v_sede
  WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_auth_profile(text)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.setup_user_sede()         TO authenticated;

-- 7. Superadmin: insertar juansataz@gmail.com
DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'juansataz@gmail.com' LIMIT 1;
  IF v_uid IS NULL THEN RETURN; END IF;

  INSERT INTO public.usuarios (id, email, nombre, rol, sede_id)
  VALUES (v_uid, 'juansataz@gmail.com', 'Juan', 'SuperAdmin', NULL)
  ON CONFLICT (id) DO UPDATE
    SET rol    = 'SuperAdmin',
        email  = EXCLUDED.email,
        sede_id = NULL;
END;
$$;

-- 8. RLS: borrar políticas anteriores y crear las nuevas basadas en sede_id
-- -----------------------------------------------------------------------

-- SEDES
DROP POLICY IF EXISTS "sedes_select"  ON public.sedes;
DROP POLICY IF EXISTS "sedes_insert"  ON public.sedes;
DROP POLICY IF EXISTS "sedes_update"  ON public.sedes;
DROP POLICY IF EXISTS "sedes_delete"  ON public.sedes;

-- SuperAdmin ve todo; el resto solo ve su propia sede
CREATE POLICY "sedes_select" ON public.sedes FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
  OR id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
);

-- Solo el SuperAdmin o el responsable de la sede puede insertar/modificar/borrar
CREATE POLICY "sedes_mutate" ON public.sedes FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
  OR responsable_id = auth.uid()
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
  OR responsable_id = auth.uid()
);

-- USUARIOS
DROP POLICY IF EXISTS "usuarios_select" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_delete" ON public.usuarios;

-- SuperAdmin ve todos; AdminSede ve los de su sede; cada uno ve su propio perfil
CREATE POLICY "usuarios_select" ON public.usuarios FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
  OR (
    sede_id IS NOT NULL
    AND sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
  )
);

-- Solo puede insertar su propio registro (lo hace sync_auth_profile)
CREATE POLICY "usuarios_insert" ON public.usuarios FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- Puede editar su propio perfil; AdminSede puede editar usuarios de su sede; SuperAdmin puede editar todo
CREATE POLICY "usuarios_update" ON public.usuarios FOR UPDATE TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
  OR (
    sede_id IS NOT NULL
    AND sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'AdminSede')
  )
)
WITH CHECK (
  id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
  OR (
    sede_id IS NOT NULL
    AND sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'AdminSede')
  )
);

CREATE POLICY "usuarios_delete" ON public.usuarios FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
  OR (
    sede_id IS NOT NULL
    AND sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'AdminSede')
  )
);

-- PARAMETROS_SISTEMA
DROP POLICY IF EXISTS "parametros_select" ON public.parametros_sistema;
DROP POLICY IF EXISTS "parametros_mutate" ON public.parametros_sistema;

CREATE POLICY "parametros_select" ON public.parametros_sistema FOR SELECT TO authenticated
USING (
  sede_id IS NULL  -- globales: todos los autenticados los ven
  OR EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
  OR sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
);

CREATE POLICY "parametros_mutate" ON public.parametros_sistema FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
  OR (
    sede_id IS NOT NULL
    AND sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
  OR (
    sede_id IS NOT NULL
    AND sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
  )
);

-- EQUIPOS
DROP POLICY IF EXISTS "equipos_select" ON public.equipos;
DROP POLICY IF EXISTS "equipos_mutate" ON public.equipos;

CREATE POLICY "equipos_select" ON public.equipos FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
  OR sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
);

CREATE POLICY "equipos_mutate" ON public.equipos FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
  OR (
    sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol IN ('SuperAdmin','AdminSede'))
  )
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
  OR (
    sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol IN ('SuperAdmin','AdminSede'))
  )
);

-- EJERCICIOS
DROP POLICY IF EXISTS "ejercicios_select" ON public.ejercicios;
DROP POLICY IF EXISTS "ejercicios_mutate" ON public.ejercicios;

CREATE POLICY "ejercicios_select" ON public.ejercicios FOR SELECT TO authenticated
USING (
  es_global = true
  OR EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
  OR sede_propietaria_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
);

CREATE POLICY "ejercicios_mutate" ON public.ejercicios FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
  OR sede_propietaria_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
  OR sede_propietaria_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
);

-- SESIONES
DROP POLICY IF EXISTS "sesiones_select" ON public.sesiones;
DROP POLICY IF EXISTS "sesiones_mutate" ON public.sesiones;

CREATE POLICY "sesiones_select" ON public.sesiones FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
  OR EXISTS (
    SELECT 1 FROM public.equipos eq
    WHERE eq.id = sesiones.equipo_id
      AND eq.sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
  )
);

CREATE POLICY "sesiones_mutate" ON public.sesiones FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
  OR EXISTS (
    SELECT 1 FROM public.equipos eq
    WHERE eq.id = sesiones.equipo_id
      AND eq.sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
  OR EXISTS (
    SELECT 1 FROM public.equipos eq
    WHERE eq.id = sesiones.equipo_id
      AND eq.sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
  )
);

-- SESION_DETALLE
DROP POLICY IF EXISTS "sesion_detalle_select" ON public.sesion_detalle;
DROP POLICY IF EXISTS "sesion_detalle_mutate" ON public.sesion_detalle;

CREATE POLICY "sesion_detalle_select" ON public.sesion_detalle FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sesiones se
    JOIN public.equipos eq ON eq.id = se.equipo_id
    WHERE se.id = sesion_detalle.sesion_id
      AND (
        EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
        OR eq.sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
      )
  )
);

CREATE POLICY "sesion_detalle_mutate" ON public.sesion_detalle FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sesiones se
    JOIN public.equipos eq ON eq.id = se.equipo_id
    WHERE se.id = sesion_detalle.sesion_id
      AND (
        EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
        OR eq.sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sesiones se
    JOIN public.equipos eq ON eq.id = se.equipo_id
    WHERE se.id = sesion_detalle.sesion_id
      AND (
        EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
        OR eq.sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
      )
  )
);

-- DOCUMENTOS
DROP POLICY IF EXISTS "documentos_select" ON public.documentos;
DROP POLICY IF EXISTS "documentos_mutate" ON public.documentos;

CREATE POLICY "documentos_select" ON public.documentos FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
  OR sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
);

CREATE POLICY "documentos_mutate" ON public.documentos FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
  OR sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
  OR sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
);

COMMIT;
