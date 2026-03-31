BEGIN;

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_workspaces_updated_at
    BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE workspace_members (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

CREATE TABLE workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_workspace_invitations_workspace ON workspace_invitations(workspace_id);
CREATE INDEX idx_workspace_invitations_email ON workspace_invitations(lower(email));

ALTER TABLE sedes
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE parametros_sistema
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE ejercicios
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

INSERT INTO workspaces (id, name)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Espacio demo'
)
ON CONFLICT (id) DO NOTHING;

UPDATE sedes SET workspace_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE workspace_id IS NULL;
ALTER TABLE sedes ALTER COLUMN workspace_id SET NOT NULL;

UPDATE parametros_sistema p
SET workspace_id = s.workspace_id
FROM sedes s
WHERE p.sede_id = s.id AND p.workspace_id IS NULL;

UPDATE parametros_sistema
SET workspace_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE workspace_id IS NULL;

ALTER TABLE parametros_sistema ALTER COLUMN workspace_id SET NOT NULL;

UPDATE ejercicios e
SET workspace_id = s.workspace_id
FROM sedes s
WHERE e.sede_propietaria_id = s.id AND e.workspace_id IS NULL;

UPDATE ejercicios
SET workspace_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE workspace_id IS NULL;

ALTER TABLE ejercicios ALTER COLUMN workspace_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_auth_profile(p_full_name text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_name text;
BEGIN
  v_email := auth.jwt() ->> 'email';
  IF v_email IS NULL OR length(trim(v_email)) = 0 THEN
    RAISE EXCEPTION 'missing email in token';
  END IF;
  v_name := coalesce(nullif(trim(p_full_name), ''), split_part(v_email, '@', 1));

  INSERT INTO usuarios (id, email, nombre, rol, sede_id, telefono, foto_perfil)
  VALUES (auth.uid(), v_email, v_name, 'AdminSede', NULL, NULL, NULL)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      nombre = coalesce(EXCLUDED.nombre, usuarios.nombre);
END;
$$;

CREATE OR REPLACE FUNCTION public.setup_user_workspaces()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seed_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_wid uuid;
  member_count int;
BEGIN
  IF EXISTS (SELECT 1 FROM workspace_members WHERE user_id = auth.uid()) THEN
    RETURN;
  END IF;

  SELECT count(*)::int INTO member_count FROM workspace_members WHERE workspace_id = seed_id;

  IF member_count = 0 THEN
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (seed_id, auth.uid(), 'admin');
    RETURN;
  END IF;

  INSERT INTO workspaces (name)
  VALUES ('Mi organización')
  RETURNING id INTO v_wid;

  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (v_wid, auth.uid(), 'admin');

  INSERT INTO sedes (nombre, direccion, configuracion_visual, workspace_id)
  VALUES ('Sede principal', '', '{}'::jsonb, v_wid);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_workspace_invitation(
  p_workspace_id uuid,
  p_email text,
  p_role text DEFAULT 'member'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_email text;
BEGIN
  v_email := lower(trim(p_email));
  IF v_email IS NULL OR length(v_email) = 0 THEN
    RAISE EXCEPTION 'invalid email';
  END IF;
  IF p_role IS NULL OR p_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'invalid role';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  v_token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO workspace_invitations (
    workspace_id, email, token, role, invited_by, expires_at
  )
  VALUES (
    p_workspace_id,
    v_email,
    v_token,
    p_role,
    auth.uid(),
    now() + interval '14 days'
  );

  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv workspace_invitations%ROWTYPE;
  v_email text;
BEGIN
  v_email := lower(trim(auth.jwt() ->> 'email'));

  SELECT * INTO inv
  FROM workspace_invitations
  WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > now();

  IF inv.id IS NULL THEN
    RAISE EXCEPTION 'invalid or expired invitation';
  END IF;

  IF lower(trim(inv.email)) <> v_email THEN
    RAISE EXCEPTION 'invitation email does not match account';
  END IF;

  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (inv.workspace_id, auth.uid(), inv.role)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  UPDATE workspace_invitations
  SET accepted_at = now()
  WHERE id = inv.id;

  RETURN inv.workspace_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_auth_profile(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.setup_user_workspaces() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_workspace_invitation(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_workspace_invitation(text) TO authenticated;

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_sedes" ON sedes;
DROP POLICY IF EXISTS "allow_all_usuarios" ON usuarios;
DROP POLICY IF EXISTS "allow_all_parametros" ON parametros_sistema;
DROP POLICY IF EXISTS "allow_all_equipos" ON equipos;
DROP POLICY IF EXISTS "allow_all_ejercicios" ON ejercicios;
DROP POLICY IF EXISTS "allow_all_sesiones" ON sesiones;
DROP POLICY IF EXISTS "allow_all_sesion_detalle" ON sesion_detalle;
DROP POLICY IF EXISTS "allow_all_documentos" ON documentos;

CREATE POLICY "sedes_select" ON sedes FOR SELECT TO authenticated
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "sedes_insert" ON sedes FOR INSERT TO authenticated
WITH CHECK (
  workspace_id IN (
    SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "sedes_update" ON sedes FOR UPDATE TO authenticated
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "sedes_delete" ON sedes FOR DELETE TO authenticated
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "usuarios_select" ON usuarios FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM workspace_members wm1
    JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = auth.uid() AND wm2.user_id = usuarios.id
  )
  OR EXISTS (
    SELECT 1 FROM equipos e
    JOIN sedes s ON s.id = e.sede_id
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE wm.user_id = auth.uid()
      AND (e.entrenador_principal_id = usuarios.id OR e.entrenador_adjunto_id = usuarios.id)
  )
  OR EXISTS (
    SELECT 1 FROM sesiones se
    JOIN equipos eq ON eq.id = se.equipo_id
    JOIN sedes s ON s.id = eq.sede_id
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE wm.user_id = auth.uid() AND se.entrenador_id = usuarios.id
  )
);

CREATE POLICY "usuarios_insert" ON usuarios FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "usuarios_update" ON usuarios FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "usuarios_delete" ON usuarios FOR DELETE TO authenticated
USING (id = auth.uid());

CREATE POLICY "parametros_select" ON parametros_sistema FOR SELECT TO authenticated
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "parametros_mutate" ON parametros_sistema FOR ALL TO authenticated
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "equipos_select" ON equipos FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sedes s
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE s.id = equipos.sede_id AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "equipos_mutate" ON equipos FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sedes s
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE s.id = equipos.sede_id AND wm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sedes s
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE s.id = equipos.sede_id AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "ejercicios_select" ON ejercicios FOR SELECT TO authenticated
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "ejercicios_mutate" ON ejercicios FOR ALL TO authenticated
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "sesiones_select" ON sesiones FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM equipos eq
    JOIN sedes s ON s.id = eq.sede_id
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE eq.id = sesiones.equipo_id AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "sesiones_mutate" ON sesiones FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM equipos eq
    JOIN sedes s ON s.id = eq.sede_id
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE eq.id = sesiones.equipo_id AND wm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM equipos eq
    JOIN sedes s ON s.id = eq.sede_id
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE eq.id = sesiones.equipo_id AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "sesion_detalle_select" ON sesion_detalle FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sesiones se
    JOIN equipos eq ON eq.id = se.equipo_id
    JOIN sedes s ON s.id = eq.sede_id
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE se.id = sesion_detalle.sesion_id AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "sesion_detalle_mutate" ON sesion_detalle FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sesiones se
    JOIN equipos eq ON eq.id = se.equipo_id
    JOIN sedes s ON s.id = eq.sede_id
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE se.id = sesion_detalle.sesion_id AND wm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sesiones se
    JOIN equipos eq ON eq.id = se.equipo_id
    JOIN sedes s ON s.id = eq.sede_id
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE se.id = sesion_detalle.sesion_id AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "documentos_select" ON documentos FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sedes s
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE s.id = documentos.sede_id AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "documentos_mutate" ON documentos FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sedes s
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE s.id = documentos.sede_id AND wm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sedes s
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE s.id = documentos.sede_id AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "workspaces_select" ON workspaces FOR SELECT TO authenticated
USING (
  id IN (
    SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "workspace_members_select" ON workspace_members FOR SELECT TO authenticated
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "workspace_invitations_select" ON workspace_invitations FOR SELECT TO authenticated
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.role = 'admin'
  )
);

COMMIT;
