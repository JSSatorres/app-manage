BEGIN;

CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);

CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  role text NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace ON public.workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON public.workspace_invitations(lower(email));

ALTER TABLE public.workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_role_check;

ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_role_check
  CHECK (role IN ('superadmin','admin','entrenador','jugador'));

ALTER TABLE public.workspace_invitations
  DROP CONSTRAINT IF EXISTS workspace_invitations_role_check;

ALTER TABLE public.workspace_invitations
  ADD CONSTRAINT workspace_invitations_role_check
  CHECK (role IN ('admin','entrenador','jugador'));

CREATE TABLE IF NOT EXISTS public.superadmins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.superadmins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS superadmins_select ON public.superadmins;
CREATE POLICY superadmins_select ON public.superadmins
FOR SELECT TO authenticated
USING (exists (select 1 from public.superadmins sa where sa.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.create_workspace_invitation(
  p_workspace_id uuid,
  p_email text,
  p_role text DEFAULT 'jugador'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_email text;
  caller_allowed boolean;
BEGIN
  v_email := lower(trim(p_email));
  IF v_email IS NULL OR length(v_email) = 0 THEN
    RAISE EXCEPTION 'invalid email';
  END IF;

  IF p_role IS NULL OR p_role NOT IN ('admin','entrenador','jugador') THEN
    RAISE EXCEPTION 'invalid role';
  END IF;

  caller_allowed := EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role IN ('admin','superadmin')
  );

  IF NOT caller_allowed THEN
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
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role = EXCLUDED.role;

  UPDATE workspace_invitations
  SET accepted_at = now()
  WHERE id = inv.id;

  RETURN inv.workspace_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.setup_user_workspaces()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wid uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM workspace_members WHERE user_id = auth.uid()) THEN
    RETURN;
  END IF;

  INSERT INTO workspaces (name)
  VALUES ('Mi organización')
  RETURNING id INTO v_wid;

  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (v_wid, auth.uid(), 'admin');

  INSERT INTO workspace_members (workspace_id, user_id, role)
  SELECT v_wid, sa.user_id, 'superadmin'
  FROM public.superadmins sa
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  INSERT INTO sedes (nombre, direccion, configuracion_visual, workspace_id)
  VALUES ('Sede principal', '', '{}'::jsonb, v_wid);
END;
$$;

INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT w.id, sa.user_id, 'superadmin'
FROM workspaces w
CROSS JOIN public.superadmins sa
ON CONFLICT (workspace_id, user_id) DO NOTHING;

GRANT EXECUTE ON FUNCTION public.setup_user_workspaces() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_workspace_invitation(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_workspace_invitation(text) TO authenticated;

COMMIT;
