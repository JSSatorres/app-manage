BEGIN;

-- Inserta juansataz@gmail.com en la tabla superadmins y en todos los workspaces.
-- El usuario ya debe existir en auth.users con ese email.

DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid
  FROM auth.users
  WHERE email = 'juansataz@gmail.com'
  LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuario juansataz@gmail.com no encontrado en auth.users. Créalo primero desde el dashboard de Supabase.';
  END IF;

  -- Asegura el registro en usuarios (por si no lo tiene)
  INSERT INTO public.usuarios (id, email, nombre, rol)
  VALUES (v_uid, 'juansataz@gmail.com', 'Juan', 'SuperAdmin')
  ON CONFLICT (id) DO UPDATE
    SET rol = 'SuperAdmin',
        email = EXCLUDED.email;

  -- Añade a la tabla superadmins
  INSERT INTO public.superadmins (user_id)
  VALUES (v_uid)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lo añade como superadmin en todos los workspaces existentes
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  SELECT w.id, v_uid, 'superadmin'
  FROM public.workspaces w
  ON CONFLICT (workspace_id, user_id) DO UPDATE
    SET role = 'superadmin';

END;
$$;

COMMIT;
