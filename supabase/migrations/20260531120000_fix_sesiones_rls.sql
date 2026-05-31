-- Fix sesiones RLS: replace sede-based policy with workspace-membership-based policy
-- The old policy used current_user_sede_id() which returns NULL for admin users,
-- blocking all inserts. The new policy mirrors the SELECT policy using workspace_members.

DROP POLICY IF EXISTS "sesiones_mutate" ON public.sesiones;

CREATE POLICY "sesiones_mutate" ON public.sesiones
  FOR ALL TO authenticated
  USING (
    equipo_id IN (
      SELECT e.id
      FROM equipos e
      JOIN sedes s ON s.id = e.sede_id
      JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    equipo_id IN (
      SELECT e.id
      FROM equipos e
      JOIN sedes s ON s.id = e.sede_id
      JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );
