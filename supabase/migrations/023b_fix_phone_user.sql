-- Fix manual: asignar sede, rol y workspace_member al usuario juansataz.phone@gmail.com
-- La invitación fue para sede 451bb2da (Sede Norte demo, workspace 4b92a025) como Entrenador

BEGIN;

-- 1. Actualizar usuarios con sede y rol correctos
UPDATE public.usuarios
SET rol     = 'Entrenador',
    sede_id = '451bb2da-1a0c-45dd-b4a2-1be6f3159f28'
WHERE email = 'juansataz.phone@gmail.com';

-- 2. Insertar en workspace_members para que loadWorkspaces() lo encuentre
INSERT INTO public.workspace_members (workspace_id, user_id, role)
VALUES (
  '4b92a025-6074-4550-bba4-6706cfea9b24',
  (SELECT id FROM public.usuarios WHERE email = 'juansataz.phone@gmail.com'),
  'entrenador'
)
ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'entrenador';

COMMIT;
