BEGIN;

-- ============================================================
-- MIGRACIÓN 010: Sistema de invitaciones por email a sede
-- ============================================================
-- Flujo:
--   1. AdminSede (o SuperAdmin) llama a create_sede_invitation(sede_id, email, rol)
--   2. Se guarda la invitación en sede_invitations
--   3. El admin envía el link /register?invite=<token> al usuario
--   4. El usuario se registra con email+password (o Google)
--   5. sync_auth_profile detecta invitación pendiente por email y asigna sede+rol
--      en lugar de crear sede propia
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sede_invitations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id    uuid NOT NULL REFERENCES public.sedes(id) ON DELETE CASCADE,
  email      text NOT NULL,
  rol        text NOT NULL CHECK (rol IN ('AdminSede','Entrenador','Jugador')),
  token      text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sede_invitations_email
  ON public.sede_invitations(lower(email));

CREATE INDEX IF NOT EXISTS idx_sede_invitations_token
  ON public.sede_invitations(token);

ALTER TABLE public.sede_invitations ENABLE ROW LEVEL SECURITY;

-- Solo superadmin y admin de la sede pueden ver/crear invitaciones
CREATE POLICY "invitations_select" ON public.sede_invitations FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
  OR sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
);

CREATE POLICY "invitations_insert" ON public.sede_invitations FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'SuperAdmin')
  OR sede_id = (SELECT sede_id FROM public.usuarios WHERE id = auth.uid())
);

-- ---------------------------------------------------------------
-- Función: crear invitación
-- ---------------------------------------------------------------
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
  v_email text;
  v_token text;
  caller_ok boolean;
BEGIN
  v_email := lower(trim(p_email));
  IF v_email IS NULL OR length(v_email) = 0 THEN
    RAISE EXCEPTION 'email inválido';
  END IF;

  IF p_rol NOT IN ('AdminSede','Entrenador','Jugador') THEN
    RAISE EXCEPTION 'rol inválido';
  END IF;

  -- Verificar que el caller es SuperAdmin o AdminSede de esa sede
  caller_ok := EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid()
      AND (u.rol = 'SuperAdmin' OR (u.rol = 'AdminSede' AND u.sede_id = p_sede_id))
  );

  IF NOT caller_ok THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;

  -- Invalidar invitaciones anteriores no aceptadas para ese email+sede
  UPDATE public.sede_invitations
  SET expires_at = now()
  WHERE lower(email) = v_email
    AND sede_id = p_sede_id
    AND accepted_at IS NULL;

  v_token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO public.sede_invitations (sede_id, email, rol, token, invited_by)
  VALUES (p_sede_id, v_email, p_rol, v_token, auth.uid());

  RETURN v_token;
END;
$$;

-- ---------------------------------------------------------------
-- Función: sync_auth_profile — ahora detecta invitación pendiente
-- ---------------------------------------------------------------
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

  -- Buscar invitación pendiente para este email
  SELECT * INTO v_inv
  FROM public.sede_invitations
  WHERE lower(email) = v_email
    AND accepted_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_inv.id IS NOT NULL THEN
    -- Registrar con la sede y rol de la invitación
    INSERT INTO public.usuarios (id, email, nombre, rol, sede_id)
    VALUES (v_uid, v_email, v_name, v_inv.rol, v_inv.sede_id)
    ON CONFLICT (id) DO UPDATE
      SET email   = EXCLUDED.email,
          nombre  = coalesce(EXCLUDED.nombre, public.usuarios.nombre),
          rol     = v_inv.rol,
          sede_id = v_inv.sede_id;

    -- Marcar invitación como aceptada
    UPDATE public.sede_invitations
    SET accepted_at = now()
    WHERE id = v_inv.id;
  ELSE
    -- Sin invitación: registrar como AdminSede sin sede (setup_user_sede la creará)
    INSERT INTO public.usuarios (id, email, nombre, rol, sede_id)
    VALUES (v_uid, v_email, v_name, 'AdminSede', NULL)
    ON CONFLICT (id) DO UPDATE
      SET email  = EXCLUDED.email,
          nombre = coalesce(EXCLUDED.nombre, public.usuarios.nombre);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_sede_invitation(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_auth_profile(text) TO authenticated;

COMMIT;
