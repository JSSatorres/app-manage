BEGIN;

CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.workspaces (id, name)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Espacio legacy')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.sedes
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.sedes
SET workspace_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE workspace_id IS NULL;

ALTER TABLE public.sedes
  ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE public.parametros_sistema
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.parametros_sistema p
SET workspace_id = s.workspace_id
FROM public.sedes s
WHERE p.workspace_id IS NULL
  AND p.sede_id IS NOT NULL
  AND p.sede_id = s.id;

UPDATE public.parametros_sistema
SET workspace_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE workspace_id IS NULL;

ALTER TABLE public.parametros_sistema
  ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE public.ejercicios
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.ejercicios e
SET workspace_id = s.workspace_id
FROM public.sedes s
WHERE e.workspace_id IS NULL
  AND e.sede_propietaria_id IS NOT NULL
  AND e.sede_propietaria_id = s.id;

UPDATE public.ejercicios
SET workspace_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE workspace_id IS NULL;

ALTER TABLE public.ejercicios
  ALTER COLUMN workspace_id SET NOT NULL;

COMMIT;
