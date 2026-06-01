-- Fix: documentos globales de club (sede_id NULL) deben estar vinculados al
-- workspace_id del club. La política anterior bloqueaba el INSERT cuando
-- sede_id era NULL porque `NULL = current_user_sede_id()` → false en SQL.
--
-- Solución:
--   1. Función helper current_user_workspace_id() (SECURITY DEFINER) que devuelve
--      el workspace al que pertenece el usuario vía workspace_members.
--   2. Política documentos_mutate reescrita para cubrir dos casos:
--        a) Documento de sede: sede_id coincide con la sede del usuario.
--        b) Documento global de club: sede_id IS NULL y workspace_id coincide
--           con el workspace del usuario (o SuperAdmin).

BEGIN;

-- ---------------------------------------------------------------
-- 1) Helper: workspace_id del usuario actual
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_workspace_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT workspace_id
  FROM public.workspace_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_workspace_id() TO authenticated;

-- ---------------------------------------------------------------
-- 2) Política documentos_mutate corregida
--    Cubre: SuperAdmin | documento de su sede | global de su club
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "documentos_mutate" ON public.documentos;

CREATE POLICY "documentos_mutate" ON public.documentos
FOR ALL TO authenticated
USING (
  public.current_user_rol() IN ('SuperAdmin', 'AdminSede', 'Entrenador')
  AND (
    public.current_user_rol() = 'SuperAdmin'
    OR sede_id = public.current_user_sede_id()
    OR (
      sede_id IS NULL
      AND workspace_id IS NOT NULL
      AND workspace_id = public.current_user_workspace_id()
    )
  )
)
WITH CHECK (
  public.current_user_rol() IN ('SuperAdmin', 'AdminSede', 'Entrenador')
  AND (
    public.current_user_rol() = 'SuperAdmin'
    OR sede_id = public.current_user_sede_id()
    OR (
      sede_id IS NULL
      AND workspace_id IS NOT NULL
      AND workspace_id = public.current_user_workspace_id()
    )
  )
);

COMMIT;
