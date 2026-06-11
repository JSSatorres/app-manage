-- ============================================================
-- sync_auth_profile multi-invitación + enlace a fichas
-- ============================================================
-- Antes (migración 023) la función solo consumía la invitación más
-- reciente (LIMIT 1), así que un usuario invitado a varias sedes acababa
-- en una sola. Además nunca conectaba la cuenta de login con la "ficha"
-- (entrenadores / jugadores), que es donde vive el modelo multi-sede real
-- (entrenador_sedes / jugador_sedes, migración 013).
--
-- Esta migración reescribe sync_auth_profile para que:
--   1. Procese TODAS las invitaciones pendientes del email (no LIMIT 1).
--   2. Por cada una: cree/actualice usuarios + workspace_members.
--   3. Conecte la mitad "login" con la mitad "fichas":
--        - Entrenador → ficha en `entrenadores` (por email+workspace) con
--          user_id = uid, y fila en `entrenador_sedes`.
--        - Jugador    → idem con `jugadores` / `jugador_sedes`.
--        - AdminSede  → no necesita ficha (ve todo el workspace).
--   4. Marque cada invitación como aceptada.
--
-- usuarios.rol / usuarios.sede_id se fijan con la PRIMERA invitación
-- (ORDER BY created_at) como "sede principal" de compatibilidad; el rol
-- efectivo por workspace vive en workspace_members, que es lo que lee la app.
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
  v_ent_id     uuid;
  v_jug_id     uuid;
  v_first      boolean := true;
  v_any        boolean := false;
BEGIN
  v_uid   := auth.uid();
  v_email := lower(trim(auth.jwt() ->> 'email'));
  IF v_email IS NULL OR length(v_email) = 0 THEN
    RAISE EXCEPTION 'missing email in token';
  END IF;
  v_name := coalesce(nullif(trim(p_full_name), ''), split_part(v_email, '@', 1));

  -- Procesar TODAS las invitaciones pendientes de este email, en orden de creación
  FOR v_inv IN
    SELECT *
    FROM public.sede_invitations
    WHERE lower(email) = v_email
      AND accepted_at IS NULL
      AND expires_at > now()
    ORDER BY created_at ASC
  LOOP
    v_any := true;

    -- Workspace de la sede de esta invitación
    SELECT workspace_id INTO v_workspace
    FROM public.sedes
    WHERE id = v_inv.sede_id;

    -- usuarios: la primera invitación fija rol/sede "principal";
    -- las siguientes solo aseguran que la fila exista (sin pisar la principal).
    IF v_first THEN
      INSERT INTO public.usuarios (id, email, nombre, rol, sede_id)
      VALUES (v_uid, v_email, v_name, v_inv.rol, v_inv.sede_id)
      ON CONFLICT (id) DO UPDATE
        SET email   = EXCLUDED.email,
            nombre  = coalesce(EXCLUDED.nombre, public.usuarios.nombre),
            rol     = v_inv.rol,
            sede_id = v_inv.sede_id;
      v_first := false;
    ELSE
      INSERT INTO public.usuarios (id, email, nombre, rol, sede_id)
      VALUES (v_uid, v_email, v_name, v_inv.rol, v_inv.sede_id)
      ON CONFLICT (id) DO UPDATE
        SET email  = EXCLUDED.email,
            nombre = coalesce(EXCLUDED.nombre, public.usuarios.nombre);
    END IF;

    IF v_workspace IS NOT NULL THEN
      -- workspace_members: role mapeado desde el rol de la invitación
      v_ws_role := CASE v_inv.rol
        WHEN 'AdminSede'  THEN 'admin'
        WHEN 'Entrenador' THEN 'entrenador'
        WHEN 'Jugador'    THEN 'jugador'
        ELSE 'jugador'
      END;

      INSERT INTO public.workspace_members (workspace_id, user_id, role)
      VALUES (v_workspace, v_uid, v_ws_role)
      ON CONFLICT (workspace_id, user_id) DO UPDATE
        SET role = EXCLUDED.role;

      -- Conectar con la mitad "fichas" según el rol
      IF v_inv.rol = 'Entrenador' THEN
        -- Buscar ficha existente por email dentro del workspace
        SELECT id INTO v_ent_id
        FROM public.entrenadores
        WHERE workspace_id = v_workspace
          AND lower(email) = v_email
        LIMIT 1;

        IF v_ent_id IS NULL THEN
          INSERT INTO public.entrenadores (nombre, email, user_id, workspace_id)
          VALUES (v_name, v_email, v_uid, v_workspace)
          RETURNING id INTO v_ent_id;
        ELSE
          UPDATE public.entrenadores
          SET user_id = v_uid
          WHERE id = v_ent_id
            AND user_id IS NULL;
        END IF;

        INSERT INTO public.entrenador_sedes (entrenador_id, sede_id)
        VALUES (v_ent_id, v_inv.sede_id)
        ON CONFLICT (entrenador_id, sede_id) DO NOTHING;

      ELSIF v_inv.rol = 'Jugador' THEN
        SELECT id INTO v_jug_id
        FROM public.jugadores
        WHERE workspace_id = v_workspace
          AND lower(email) = v_email
        LIMIT 1;

        IF v_jug_id IS NULL THEN
          INSERT INTO public.jugadores (nombre, email, user_id, workspace_id)
          VALUES (v_name, v_email, v_uid, v_workspace)
          RETURNING id INTO v_jug_id;
        ELSE
          UPDATE public.jugadores
          SET user_id = v_uid
          WHERE id = v_jug_id
            AND user_id IS NULL;
        END IF;

        INSERT INTO public.jugador_sedes (jugador_id, sede_id)
        VALUES (v_jug_id, v_inv.sede_id)
        ON CONFLICT (jugador_id, sede_id) DO NOTHING;
      END IF;
    END IF;

    -- Marcar invitación aceptada
    UPDATE public.sede_invitations
    SET accepted_at = now()
    WHERE id = v_inv.id;
  END LOOP;

  -- Sin invitaciones: alta como AdminSede sin sede (setup_user_sede la creará)
  IF NOT v_any THEN
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
