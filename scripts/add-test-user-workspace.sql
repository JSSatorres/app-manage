-- Añadir usuario de test como admin del workspace legacy (donde están todos los datos demo)
INSERT INTO public.workspace_members (workspace_id, user_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '0137e467-3273-42dc-91ed-38a153602ee0',
  'admin'
)
ON CONFLICT (workspace_id, user_id) DO NOTHING;
