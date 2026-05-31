-- ============================================================
-- APLICAR EN SUPABASE SQL EDITOR
-- Combina migración 009 + 010 — fix recursión RLS
-- ============================================================

BEGIN;

-- ============================================================
-- 009: Eliminar workspaces y simplificar a sede_id
-- ============================================================

DROP TABLE IF EXISTS public.workspace_invitations CASCADE;
DROP TABLE IF EXISTS public.workspace_members CASCADE;
DROP TABLE IF EXISTS public.superadmins CASCADE;

ALTER TABLE public.sedes              DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.parametros_sistema DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.ejercicios         DROP COLUMN IF EXISTS workspace_id;

DROP TABLE IF EXISTS public.workspaces CASCADE;

DROP FUNCTION IF EXISTS public.setup_user_workspaces() CASCADE;
DROP FUNCTION IF EXISTS public.create_workspace_invitation(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.accept_workspace_invitation(text) CASCADE;
DROP FUNCTION IF EXISTS public.sync_rol_from_workspace_member() CASCADE;

-- ---------------------------------------------------------------
-- Funciones auxiliares SECURITY DEFINER para evitar recursión RLS
-- Leen directamente sin pasar por las policies de usuarios
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_rol()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT rol FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_sede_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT sede_id FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_rol()     TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_sede_id() TO authenticated;

-- ---------------------------------------------------------------
-- setup_user_sede: crea sede por defecto para AdminSede nuevo
-- ---------------------------------------------------------------
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

  IF v_rol = 'SuperAdmin' THEN RETURN; END IF;
  IF v_sede IS NOT NULL THEN RETURN; END IF;

  INSERT INTO public.sedes (nombre, direccion, configuracion_visual, responsable_id)
  VALUES ('Mi sede', '', '{}'::jsonb, v_uid)
  RETURNING id INTO v_sede;

  UPDATE public.usuarios
  SET sede_id = v_sede
  WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.setup_user_sede() TO authenticated;

-- ---------------------------------------------------------------
-- Superadmin: juansataz@gmail.com
-- ---------------------------------------------------------------
DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'juansataz@gmail.com' LIMIT 1;
  IF v_uid IS NULL THEN RETURN; END IF;

  INSERT INTO public.usuarios (id, email, nombre, rol, sede_id)
  VALUES (v_uid, 'juansataz@gmail.com', 'Juan', 'SuperAdmin', NULL)
  ON CONFLICT (id) DO UPDATE
    SET rol     = 'SuperAdmin',
        email   = EXCLUDED.email,
        sede_id = NULL;
END;
$$;

-- ============================================================
-- RLS — todas las policies usan current_user_rol() y
--       current_user_sede_id() para evitar recursión infinita
-- ============================================================

-- SEDES
DROP POLICY IF EXISTS "sedes_select" ON public.sedes;
DROP POLICY IF EXISTS "sedes_insert" ON public.sedes;
DROP POLICY IF EXISTS "sedes_update" ON public.sedes;
DROP POLICY IF EXISTS "sedes_delete" ON public.sedes;
DROP POLICY IF EXISTS "sedes_mutate" ON public.sedes;

CREATE POLICY "sedes_select" ON public.sedes FOR SELECT TO authenticated
USING (
  public.current_user_rol() = 'SuperAdmin'
  OR id = public.current_user_sede_id()
);

CREATE POLICY "sedes_mutate" ON public.sedes FOR ALL TO authenticated
USING (
  public.current_user_rol() = 'SuperAdmin'
  OR responsable_id = auth.uid()
)
WITH CHECK (
  public.current_user_rol() = 'SuperAdmin'
  OR responsable_id = auth.uid()
);

-- USUARIOS
DROP POLICY IF EXISTS "usuarios_select" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_delete" ON public.usuarios;

CREATE POLICY "usuarios_select" ON public.usuarios FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR public.current_user_rol() = 'SuperAdmin'
  OR (
    sede_id IS NOT NULL
    AND sede_id = public.current_user_sede_id()
  )
);

CREATE POLICY "usuarios_insert" ON public.usuarios FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "usuarios_update" ON public.usuarios FOR UPDATE TO authenticated
USING (
  id = auth.uid()
  OR public.current_user_rol() = 'SuperAdmin'
  OR (
    sede_id IS NOT NULL
    AND sede_id = public.current_user_sede_id()
    AND public.current_user_rol() = 'AdminSede'
  )
)
WITH CHECK (
  id = auth.uid()
  OR public.current_user_rol() = 'SuperAdmin'
  OR (
    sede_id IS NOT NULL
    AND sede_id = public.current_user_sede_id()
    AND public.current_user_rol() = 'AdminSede'
  )
);

CREATE POLICY "usuarios_delete" ON public.usuarios FOR DELETE TO authenticated
USING (
  public.current_user_rol() = 'SuperAdmin'
  OR (
    sede_id IS NOT NULL
    AND sede_id = public.current_user_sede_id()
    AND public.current_user_rol() = 'AdminSede'
  )
);

-- PARAMETROS_SISTEMA
DROP POLICY IF EXISTS "parametros_select" ON public.parametros_sistema;
DROP POLICY IF EXISTS "parametros_mutate" ON public.parametros_sistema;

CREATE POLICY "parametros_select" ON public.parametros_sistema FOR SELECT TO authenticated
USING (
  sede_id IS NULL
  OR public.current_user_rol() = 'SuperAdmin'
  OR sede_id = public.current_user_sede_id()
);

CREATE POLICY "parametros_mutate" ON public.parametros_sistema FOR ALL TO authenticated
USING (
  public.current_user_rol() = 'SuperAdmin'
  OR (sede_id IS NOT NULL AND sede_id = public.current_user_sede_id())
)
WITH CHECK (
  public.current_user_rol() = 'SuperAdmin'
  OR (sede_id IS NOT NULL AND sede_id = public.current_user_sede_id())
);

-- EQUIPOS
DROP POLICY IF EXISTS "equipos_select" ON public.equipos;
DROP POLICY IF EXISTS "equipos_mutate" ON public.equipos;

CREATE POLICY "equipos_select" ON public.equipos FOR SELECT TO authenticated
USING (
  public.current_user_rol() = 'SuperAdmin'
  OR sede_id = public.current_user_sede_id()
);

CREATE POLICY "equipos_mutate" ON public.equipos FOR ALL TO authenticated
USING (
  public.current_user_rol() = 'SuperAdmin'
  OR (
    sede_id = public.current_user_sede_id()
    AND public.current_user_rol() IN ('SuperAdmin','AdminSede')
  )
)
WITH CHECK (
  public.current_user_rol() = 'SuperAdmin'
  OR (
    sede_id = public.current_user_sede_id()
    AND public.current_user_rol() IN ('SuperAdmin','AdminSede')
  )
);

-- EJERCICIOS
DROP POLICY IF EXISTS "ejercicios_select" ON public.ejercicios;
DROP POLICY IF EXISTS "ejercicios_mutate" ON public.ejercicios;

CREATE POLICY "ejercicios_select" ON public.ejercicios FOR SELECT TO authenticated
USING (
  es_global = true
  OR public.current_user_rol() = 'SuperAdmin'
  OR sede_propietaria_id = public.current_user_sede_id()
);

CREATE POLICY "ejercicios_mutate" ON public.ejercicios FOR ALL TO authenticated
USING (
  public.current_user_rol() = 'SuperAdmin'
  OR sede_propietaria_id = public.current_user_sede_id()
)
WITH CHECK (
  public.current_user_rol() = 'SuperAdmin'
  OR sede_propietaria_id = public.current_user_sede_id()
);

-- SESIONES
DROP POLICY IF EXISTS "sesiones_select" ON public.sesiones;
DROP POLICY IF EXISTS "sesiones_mutate" ON public.sesiones;

CREATE POLICY "sesiones_select" ON public.sesiones FOR SELECT TO authenticated
USING (
  public.current_user_rol() = 'SuperAdmin'
  OR EXISTS (
    SELECT 1 FROM public.equipos eq
    WHERE eq.id = sesiones.equipo_id
      AND eq.sede_id = public.current_user_sede_id()
  )
);

CREATE POLICY "sesiones_mutate" ON public.sesiones FOR ALL TO authenticated
USING (
  public.current_user_rol() = 'SuperAdmin'
  OR EXISTS (
    SELECT 1 FROM public.equipos eq
    WHERE eq.id = sesiones.equipo_id
      AND eq.sede_id = public.current_user_sede_id()
  )
)
WITH CHECK (
  public.current_user_rol() = 'SuperAdmin'
  OR EXISTS (
    SELECT 1 FROM public.equipos eq
    WHERE eq.id = sesiones.equipo_id
      AND eq.sede_id = public.current_user_sede_id()
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
        public.current_user_rol() = 'SuperAdmin'
        OR eq.sede_id = public.current_user_sede_id()
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
        public.current_user_rol() = 'SuperAdmin'
        OR eq.sede_id = public.current_user_sede_id()
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sesiones se
    JOIN public.equipos eq ON eq.id = se.equipo_id
    WHERE se.id = sesion_detalle.sesion_id
      AND (
        public.current_user_rol() = 'SuperAdmin'
        OR eq.sede_id = public.current_user_sede_id()
      )
  )
);

-- DOCUMENTOS
DROP POLICY IF EXISTS "documentos_select" ON public.documentos;
DROP POLICY IF EXISTS "documentos_mutate" ON public.documentos;

CREATE POLICY "documentos_select" ON public.documentos FOR SELECT TO authenticated
USING (
  public.current_user_rol() = 'SuperAdmin'
  OR sede_id = public.current_user_sede_id()
);

CREATE POLICY "documentos_mutate" ON public.documentos FOR ALL TO authenticated
USING (
  public.current_user_rol() = 'SuperAdmin'
  OR sede_id = public.current_user_sede_id()
)
WITH CHECK (
  public.current_user_rol() = 'SuperAdmin'
  OR sede_id = public.current_user_sede_id()
);

-- ============================================================
-- 010: Sistema de invitaciones por email a sede
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sede_invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id     uuid NOT NULL REFERENCES public.sedes(id) ON DELETE CASCADE,
  email       text NOT NULL,
  rol         text NOT NULL CHECK (rol IN ('AdminSede','Entrenador','Jugador')),
  token       text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  invited_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '30 days',
  accepted_at timestamptz,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sede_invitations_email
  ON public.sede_invitations(lower(email));

CREATE INDEX IF NOT EXISTS idx_sede_invitations_token
  ON public.sede_invitations(token);

ALTER TABLE public.sede_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invitations_select" ON public.sede_invitations;
DROP POLICY IF EXISTS "invitations_insert" ON public.sede_invitations;

CREATE POLICY "invitations_select" ON public.sede_invitations FOR SELECT TO authenticated
USING (
  public.current_user_rol() = 'SuperAdmin'
  OR sede_id = public.current_user_sede_id()
);

CREATE POLICY "invitations_insert" ON public.sede_invitations FOR INSERT TO authenticated
WITH CHECK (
  public.current_user_rol() = 'SuperAdmin'
  OR sede_id = public.current_user_sede_id()
);

-- Función: crear invitación
CREATE OR REPLACE FUNCTION public.create_sede_invitation(
  p_sede_id uuid,
  p_email   text,
  p_rol     text DEFAULT 'Entrenador'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email    text;
  v_token    text;
  caller_rol text;
  caller_sede uuid;
BEGIN
  v_email := lower(trim(p_email));
  IF v_email IS NULL OR length(v_email) = 0 THEN
    RAISE EXCEPTION 'email inválido';
  END IF;

  IF p_rol NOT IN ('AdminSede','Entrenador','Jugador') THEN
    RAISE EXCEPTION 'rol inválido';
  END IF;

  SELECT rol, sede_id INTO caller_rol, caller_sede
  FROM public.usuarios WHERE id = auth.uid();

  IF caller_rol IS NULL THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;

  IF caller_rol != 'SuperAdmin' AND (caller_rol != 'AdminSede' OR caller_sede != p_sede_id) THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;

  -- Invalidar invitaciones anteriores no aceptadas para ese email+sede
  UPDATE public.sede_invitations
  SET expires_at = now()
  WHERE lower(email) = v_email
    AND sede_id = p_sede_id
    AND accepted_at IS NULL;

  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  INSERT INTO public.sede_invitations (sede_id, email, rol, token, invited_by)
  VALUES (p_sede_id, v_email, p_rol, v_token, auth.uid());

  RETURN v_token;
END;
$$;

-- Función: sync_auth_profile — detecta invitación pendiente al registrarse
CREATE OR REPLACE FUNCTION public.sync_auth_profile(p_full_name text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   uuid;
  v_email text;
  v_name  text;
  v_inv   public.sede_invitations%ROWTYPE;
BEGIN
  v_uid   := auth.uid();
  v_email := lower(trim(auth.jwt() ->> 'email'));
  IF v_email IS NULL OR length(v_email) = 0 THEN
    RAISE EXCEPTION 'missing email in token';
  END IF;
  v_name := coalesce(nullif(trim(p_full_name), ''), split_part(v_email, '@', 1));

  SELECT * INTO v_inv
  FROM public.sede_invitations
  WHERE lower(email) = v_email
    AND accepted_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_inv.id IS NOT NULL THEN
    INSERT INTO public.usuarios (id, email, nombre, rol, sede_id)
    VALUES (v_uid, v_email, v_name, v_inv.rol, v_inv.sede_id)
    ON CONFLICT (id) DO UPDATE
      SET email   = EXCLUDED.email,
          nombre  = coalesce(EXCLUDED.nombre, public.usuarios.nombre),
          rol     = v_inv.rol,
          sede_id = v_inv.sede_id;

    UPDATE public.sede_invitations
    SET accepted_at = now()
    WHERE id = v_inv.id;
  ELSE
    INSERT INTO public.usuarios (id, email, nombre, rol, sede_id)
    VALUES (v_uid, v_email, v_name, 'AdminSede', NULL)
    ON CONFLICT (id) DO UPDATE
      SET email  = EXCLUDED.email,
          nombre = coalesce(EXCLUDED.nombre, public.usuarios.nombre);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_sede_invitation(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_auth_profile(text)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.setup_user_sede()                         TO authenticated;

COMMIT;
