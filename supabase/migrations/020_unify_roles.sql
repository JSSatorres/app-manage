-- ============================================================
-- MIGRACIÓN 020: Unificar el vocabulario de rol + rol gerente_sede
-- ============================================================
-- En la BD real conviven dos fuentes de rol:
--   * workspace_members.role  → 'admin' | 'entrenador' | 'jugador' | 'superadmin'  (lo lee el frontend)
--   * usuarios.rol            → 'SuperAdmin' | 'AdminSede' | 'Entrenador' | 'Jugador' (lo usan las RLS)
--
-- Esta migración:
--   1. Hace de workspace_members.role la FUENTE DE VERDAD para permisos.
--   2. Añade el rol nuevo 'gerente_sede' (gestor acotado a UNA sede).
--   3. Mantiene usuarios.rol sincronizado automáticamente desde workspace_members
--      (vía trigger), para que las RLS existentes que leen usuarios.rol sigan
--      funcionando sin reescribirlas todas.
--
-- Idempotente.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Ampliar CHECK constraints para incluir 'gerente_sede'
-- ------------------------------------------------------------
ALTER TABLE public.workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_role_check;
ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_role_check
  CHECK (role IN ('superadmin','admin','gerente_sede','entrenador','jugador'));

ALTER TABLE public.workspace_invitations
  DROP CONSTRAINT IF EXISTS workspace_invitations_role_check;
ALTER TABLE public.workspace_invitations
  ADD CONSTRAINT workspace_invitations_role_check
  CHECK (role IN ('admin','gerente_sede','entrenador','jugador'));

-- usuarios.rol: el vocabulario canónico interno mantiene mayúsculas. 'gerente_sede'
-- se mapea a 'AdminSede' (mismo nivel de gestión, acotado por sede_id).
ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('SuperAdmin','AdminSede','Entrenador','Jugador'));

-- ------------------------------------------------------------
-- 2. Helper: rol del usuario en un workspace (SECURITY DEFINER, sin recursión RLS)
--    Análogo a current_user_rol() / current_user_sede_id() (ver APPLY_NOW.sql).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_ws_role(p_workspace uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role
  FROM public.workspace_members
  WHERE workspace_id = p_workspace
    AND user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_ws_role(uuid) TO authenticated;

-- ------------------------------------------------------------
-- 3. Mapeo workspace_members.role → usuarios.rol y trigger de sincronización
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.map_ws_role_to_usuario_rol(p_role text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_role
    WHEN 'superadmin'   THEN 'SuperAdmin'
    WHEN 'admin'        THEN 'AdminSede'
    WHEN 'gerente_sede' THEN 'AdminSede'
    WHEN 'entrenador'   THEN 'Entrenador'
    WHEN 'jugador'      THEN 'Jugador'
    ELSE 'Jugador'
  END;
$$;

CREATE OR REPLACE FUNCTION public.sync_rol_from_workspace_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.usuarios
  SET rol = public.map_ws_role_to_usuario_rol(NEW.role)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_rol_from_workspace_member ON public.workspace_members;
CREATE TRIGGER trg_sync_rol_from_workspace_member
AFTER INSERT OR UPDATE OF role ON public.workspace_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_rol_from_workspace_member();

-- ------------------------------------------------------------
-- 4. Sincronización inicial: alinear usuarios.rol con el rol del workspace
--    (si un usuario está en varios workspaces, gana el de mayor privilegio).
-- ------------------------------------------------------------
UPDATE public.usuarios u
SET rol = sub.mapped_rol
FROM (
  SELECT wm.user_id,
         public.map_ws_role_to_usuario_rol(
           -- prioridad: superadmin > admin > gerente_sede > entrenador > jugador
           (ARRAY_AGG(wm.role ORDER BY CASE wm.role
              WHEN 'superadmin'   THEN 1
              WHEN 'admin'        THEN 2
              WHEN 'gerente_sede' THEN 3
              WHEN 'entrenador'   THEN 4
              WHEN 'jugador'      THEN 5
              ELSE 6 END))[1]
         ) AS mapped_rol
  FROM public.workspace_members wm
  GROUP BY wm.user_id
) sub
WHERE u.id = sub.user_id;

COMMIT;
