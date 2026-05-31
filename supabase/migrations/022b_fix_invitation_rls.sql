DROP POLICY IF EXISTS "invitations_insert" ON public.sede_invitations;
CREATE POLICY "invitations_insert" ON public.sede_invitations FOR INSERT TO authenticated
WITH CHECK (
  public.current_user_rol() = 'SuperAdmin'
  OR sede_id = public.current_user_sede_id()
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    JOIN public.sedes s ON s.workspace_id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
      AND wm.role IN ('admin', 'gerente_sede', 'superadmin')
      AND s.id = sede_id
  )
  OR EXISTS (
    SELECT 1 FROM public.sedes s
    WHERE s.id = sede_id AND s.responsable_id = auth.uid()
  )
);
