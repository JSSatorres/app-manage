-- Crear workspace legacy si no existe
INSERT INTO public.workspaces (id, name, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Club Demo', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Añadir usuario de test como admin del workspace legacy
INSERT INTO public.workspace_members (workspace_id, user_id, role, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '0137e467-3273-42dc-91ed-38a153602ee0',
  'admin',
  now()
)
ON CONFLICT (workspace_id, user_id) DO NOTHING;
