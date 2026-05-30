-- ============================================================
-- MIGRACIÓN 021: RLS por rol (refuerzo de la matriz de permisos)
-- ============================================================
-- Tras 020, usuarios.rol queda sincronizado desde workspace_members.role:
--   admin / gerente_sede → 'AdminSede'   (gestor; el alcance de sede lo aplica el frontend)
--   entrenador           → 'Entrenador'
--   jugador              → 'Jugador'
--   superadmin           → 'SuperAdmin'
--
-- Las RLS de 009/013 ya cubren el filtrado por sede para la mayoría de tablas.
-- Esta migración refuerza los puntos donde la matriz exige distinción de rol:
--   * parametros_sistema: solo SuperAdmin/AdminSede pueden mutar (no Entrenador/Jugador).
--   * usuarios: Entrenador/Jugador no pueden mutar otros usuarios (solo su propio perfil).
--   * ejercicios/documentos: Jugador es solo lectura.
--
-- Reutiliza el patrón de 009/013: current_user_rol() (SECURITY DEFINER) evita la
-- recursión RLS. Idempotente (DROP POLICY IF EXISTS antes de crear).
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- PARAMETROS_SISTEMA — solo gestores mutan; lectura para todos los de la sede
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "parametros_mutate" ON public.parametros_sistema;
CREATE POLICY "parametros_mutate" ON public.parametros_sistema FOR ALL TO authenticated
USING (
  public.current_user_rol() IN ('SuperAdmin','AdminSede')
  AND (
    public.current_user_rol() = 'SuperAdmin'
    OR sede_id IS NULL
    OR sede_id = public.current_user_sede_id()
  )
)
WITH CHECK (
  public.current_user_rol() IN ('SuperAdmin','AdminSede')
  AND (
    public.current_user_rol() = 'SuperAdmin'
    OR sede_id IS NULL
    OR sede_id = public.current_user_sede_id()
  )
);

-- ------------------------------------------------------------
-- EJERCICIOS — Jugador solo lectura; gestores y entrenadores mutan en su sede
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "ejercicios_mutate" ON public.ejercicios;
CREATE POLICY "ejercicios_mutate" ON public.ejercicios FOR ALL TO authenticated
USING (
  public.current_user_rol() IN ('SuperAdmin','AdminSede','Entrenador')
  AND (
    public.current_user_rol() = 'SuperAdmin'
    OR sede_propietaria_id = public.current_user_sede_id()
  )
)
WITH CHECK (
  public.current_user_rol() IN ('SuperAdmin','AdminSede','Entrenador')
  AND (
    public.current_user_rol() = 'SuperAdmin'
    OR sede_propietaria_id = public.current_user_sede_id()
  )
);

-- ------------------------------------------------------------
-- DOCUMENTOS — Jugador solo lectura; gestores y entrenadores mutan en su sede
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "documentos_mutate" ON public.documentos;
CREATE POLICY "documentos_mutate" ON public.documentos FOR ALL TO authenticated
USING (
  public.current_user_rol() IN ('SuperAdmin','AdminSede','Entrenador')
  AND (
    public.current_user_rol() = 'SuperAdmin'
    OR sede_id = public.current_user_sede_id()
  )
)
WITH CHECK (
  public.current_user_rol() IN ('SuperAdmin','AdminSede','Entrenador')
  AND (
    public.current_user_rol() = 'SuperAdmin'
    OR sede_id = public.current_user_sede_id()
  )
);

-- ------------------------------------------------------------
-- USUARIOS — Entrenador/Jugador NO gestionan otros usuarios.
-- Reescribe usuarios_update / usuarios_delete (009) para excluirlos.
-- Cada uno conserva la edición de su propio perfil.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "usuarios_update" ON public.usuarios;
CREATE POLICY "usuarios_update" ON public.usuarios FOR UPDATE TO authenticated
USING (
  id = auth.uid()
  OR public.current_user_rol() = 'SuperAdmin'
  OR (
    public.current_user_rol() = 'AdminSede'
    AND sede_id IS NOT NULL
    AND sede_id = public.current_user_sede_id()
  )
)
WITH CHECK (
  id = auth.uid()
  OR public.current_user_rol() = 'SuperAdmin'
  OR (
    public.current_user_rol() = 'AdminSede'
    AND sede_id IS NOT NULL
    AND sede_id = public.current_user_sede_id()
  )
);

DROP POLICY IF EXISTS "usuarios_delete" ON public.usuarios;
CREATE POLICY "usuarios_delete" ON public.usuarios FOR DELETE TO authenticated
USING (
  public.current_user_rol() = 'SuperAdmin'
  OR (
    public.current_user_rol() = 'AdminSede'
    AND sede_id IS NOT NULL
    AND sede_id = public.current_user_sede_id()
  )
);

COMMIT;
