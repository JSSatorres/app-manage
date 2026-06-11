BEGIN;

-- ============================================================
-- RE-FIX: re-aplicar el estado 'NoRealizada' en sesiones
-- ============================================================
-- La migración 011_estado_no_realizada.sql añadió 'NoRealizada' al CHECK de
-- sesiones.estado, pero una migración posterior de reconciliación/snapshot del
-- esquema real (019_snapshot_estado_real.sql) recreó la tabla/constraint SIN ese
-- valor. En el entorno remoto la constraint quedó como:
--   CHECK (estado IN ('Borrador','Planificada','Realizada'))
-- lo que impide marcar sesiones como "No realizada" (p. ej. canceladas por lluvia).
--
-- Esta migración vuelve a dejar el CHECK correcto. Es idempotente.

ALTER TABLE public.sesiones DROP CONSTRAINT IF EXISTS sesiones_estado_check;

ALTER TABLE public.sesiones
  ADD CONSTRAINT sesiones_estado_check
  CHECK (estado IN ('Borrador', 'Planificada', 'Realizada', 'NoRealizada'));

COMMIT;
