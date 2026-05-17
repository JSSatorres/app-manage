BEGIN;

-- ============================================================
-- MIGRACIÓN 011: Añadir estado 'NoRealizada' a sesiones
-- ============================================================
-- Permite marcar sesiones planificadas que finalmente no se ejecutaron.

ALTER TABLE sesiones DROP CONSTRAINT IF EXISTS sesiones_estado_check;

ALTER TABLE sesiones
  ADD CONSTRAINT sesiones_estado_check
  CHECK (estado IN ('Borrador', 'Planificada', 'Realizada', 'NoRealizada'));

COMMIT;
