BEGIN;

-- 1. Ampliar el CHECK constraint de usuarios.rol para incluir Jugador
ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_rol_check;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('SuperAdmin', 'AdminSede', 'Entrenador', 'Jugador'));

-- 2. Función que mantiene usuarios.rol sincronizado con workspace_members.role
--    Cuando se inserta o actualiza el role en workspace_members, se actualiza
--    el campo rol en la tabla usuarios para que ambos estén alineados.
CREATE OR REPLACE FUNCTION public.sync_rol_from_workspace_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.usuarios
  SET rol = CASE NEW.role
    WHEN 'superadmin' THEN 'SuperAdmin'
    WHEN 'admin'      THEN 'AdminSede'
    WHEN 'entrenador' THEN 'Entrenador'
    WHEN 'jugador'    THEN 'Jugador'
    ELSE 'Jugador'
  END
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- 3. Trigger que dispara la función anterior
DROP TRIGGER IF EXISTS trg_sync_rol_from_workspace_member ON public.workspace_members;

CREATE TRIGGER trg_sync_rol_from_workspace_member
AFTER INSERT OR UPDATE OF role ON public.workspace_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_rol_from_workspace_member();

-- 4. Sincronización inicial: alinear roles existentes
UPDATE public.usuarios u
SET rol = CASE wm.role
  WHEN 'superadmin' THEN 'SuperAdmin'
  WHEN 'admin'      THEN 'AdminSede'
  WHEN 'entrenador' THEN 'Entrenador'
  WHEN 'jugador'    THEN 'Jugador'
  ELSE u.rol
END
FROM public.workspace_members wm
WHERE wm.user_id = u.id;

COMMIT;
