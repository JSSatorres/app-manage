-- Fix RLS sedes_select: incluir sedes del workspace del usuario via workspace_members
DROP POLICY IF EXISTS "sedes_select" ON public.sedes;
CREATE POLICY "sedes_select" ON public.sedes FOR SELECT TO authenticated
USING (
  public.current_user_rol() = 'SuperAdmin'
  OR id = public.current_user_sede_id()
  OR responsable_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.workspace_id = sedes.workspace_id
  )
);
