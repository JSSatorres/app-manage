-- ============================================================
-- MIGRACIÓN 023: sync_auth_profile inserta en workspace_members
-- ============================================================
-- Al registrarse con invitación, el usuario quedaba en public.usuarios
-- con sede_id y rol correctos, pero loadWorkspaces() lee workspace_members
-- y no encontraba nada → pantalla de onboarding "Crea tu club".
--
-- Fix: cuando se acepta una invitación, insertar también en workspace_members
-- con el role equivalente al rol de la invitación.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_auth_profile(p_full_name text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        uuid;
  v_email      text;
  v_name       text;
  v_inv        public.sede_invitations%ROWTYPE;
  v_workspace  uuid;
  v_ws_role    text;
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
    -- Registrar en public.usuarios con sede y rol de la invitación
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

    -- Obtener el workspace de la sede
    SELECT workspace_id INTO v_workspace
    FROM public.sedes
    WHERE id = v_inv.sede_id;

    IF v_workspace IS NOT NULL THEN
      -- Mapear rol de invitación → role de workspace_members
      v_ws_role := CASE v_inv.rol
        WHEN 'AdminSede' THEN 'admin'
        WHEN 'Entrenador' THEN 'entrenador'
        WHEN 'Jugador' THEN 'jugador'
        ELSE 'jugador'
      END;

      -- Insertar en workspace_members si no existe ya
      INSERT INTO public.workspace_members (workspace_id, user_id, role)
      VALUES (v_workspace, v_uid, v_ws_role)
      ON CONFLICT (workspace_id, user_id) DO UPDATE
        SET role = EXCLUDED.role;
    END IF;

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

GRANT EXECUTE ON FUNCTION public.sync_auth_profile(text) TO authenticated;

COMMIT;
