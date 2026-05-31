-- ============================================================
-- MIGRACIÓN 022: Actualizar create_sede_invitation para usar workspace_members
-- ============================================================
-- La RPC original verifica autorización leyendo usuarios.sede_id, pero desde
-- la migración 020 la fuente de verdad de roles es workspace_members.
-- Un usuario con role='admin' o 'gerente_sede' en workspace_members puede ser
-- AdminSede aunque usuarios.sede_id no coincida exactamente.
--
-- Esta migración reemplaza la función para que verifique:
--   1. SuperAdmin en usuarios.rol, O
--   2. Ser admin/gerente_sede en workspace_members para el workspace al que
--      pertenece la sede solicitada.
-- ============================================================

BEGIN;

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
  v_email      text;
  v_token      text;
  caller_rol   text;
  caller_ok    boolean;
BEGIN
  v_email := lower(trim(p_email));
  IF v_email IS NULL OR length(v_email) = 0 THEN
    RAISE EXCEPTION 'email inválido';
  END IF;

  IF p_rol NOT IN ('AdminSede','Entrenador','Jugador') THEN
    RAISE EXCEPTION 'rol inválido';
  END IF;

  -- Obtener rol del caller desde usuarios (cache sincronizado desde workspace_members)
  SELECT rol INTO caller_rol
  FROM public.usuarios
  WHERE id = auth.uid();

  IF caller_rol IS NULL THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;

  -- SuperAdmin puede invitar a cualquier sede
  IF caller_rol = 'SuperAdmin' THEN
    caller_ok := true;
  ELSE
    -- Opción 1: es admin/gerente_sede en workspace_members para el workspace de la sede
    caller_ok := EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      JOIN public.sedes s ON s.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'gerente_sede', 'superadmin')
        AND s.id = p_sede_id
    );

    -- Opción 2: es responsable directo de la sede
    IF NOT caller_ok THEN
      caller_ok := EXISTS (
        SELECT 1 FROM public.sedes s
        WHERE s.id = p_sede_id
          AND s.responsable_id = auth.uid()
      );
    END IF;

    -- Opción 3: compatibilidad con modelo antiguo (usuarios.sede_id)
    IF NOT caller_ok THEN
      caller_ok := EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = auth.uid()
          AND u.rol = 'AdminSede'
          AND u.sede_id = p_sede_id
      );
    END IF;
  END IF;

  IF NOT caller_ok THEN
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

GRANT EXECUTE ON FUNCTION public.create_sede_invitation(uuid, text, text) TO authenticated;

COMMIT;
