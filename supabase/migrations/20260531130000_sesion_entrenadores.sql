BEGIN;

-- ============================================================
-- MIGRACIÓN: Múltiples entrenadores por sesión
-- ============================================================
-- Modelo:
--   * Una sesión puede tener VARIOS entrenadores → tabla pivote.
--   * Referencia a `entrenadores(id)` (migración 013), coherente con
--     `entrenador_equipos` y el lookup de entrenadores de la app.
--   * Se mantiene `sesiones.entrenador_id` por compatibilidad (entrenador
--     principal). La tabla pivote es la fuente de verdad para el conjunto.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sesion_entrenadores (
    sesion_id     UUID NOT NULL REFERENCES public.sesiones(id) ON DELETE CASCADE,
    entrenador_id UUID NOT NULL REFERENCES public.entrenadores(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (sesion_id, entrenador_id)
);

CREATE INDEX IF NOT EXISTS idx_sesion_entrenadores_sesion ON public.sesion_entrenadores(sesion_id);
CREATE INDEX IF NOT EXISTS idx_sesion_entrenadores_entrenador ON public.sesion_entrenadores(entrenador_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.sesion_entrenadores ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    CREATE POLICY "sesion_entrenadores_select" ON public.sesion_entrenadores
        FOR SELECT USING (auth.role() = 'authenticated');
    CREATE POLICY "sesion_entrenadores_insert" ON public.sesion_entrenadores
        FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    CREATE POLICY "sesion_entrenadores_update" ON public.sesion_entrenadores
        FOR UPDATE USING (auth.role() = 'authenticated');
    CREATE POLICY "sesion_entrenadores_delete" ON public.sesion_entrenadores
        FOR DELETE USING (auth.role() = 'authenticated');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
