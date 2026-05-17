-- Fix: setup_workspace devuelve el workspace existente en lugar de lanzar error
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
