-- Corregir política RLS recursiva en workspace_members
-- El problema: la policy se auto-referenciaba causando infinite recursion
DROP POLICY IF EXISTS workspace_members_select ON public.workspace_members;
CREATE POLICY workspace_members_select ON public.workspace_members
  FOR SELECT USING (user_id = auth.uid());
