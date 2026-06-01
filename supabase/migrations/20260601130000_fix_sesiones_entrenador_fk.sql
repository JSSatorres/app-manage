BEGIN;

-- ============================================================
-- FIX: sesiones.entrenador_id debe referenciar `entrenadores`,
-- no `usuarios`.
-- ------------------------------------------------------------
-- Causa: la migración 001 creó el FK `sesiones_entrenador_id_fkey`
-- contra `usuarios(id)`, pero toda la app (lookup, formularios,
-- pivote `sesion_entrenadores`) usa la tabla `entrenadores(id)`.
-- Al insertar un id de `entrenadores` en la columna, el FK contra
-- `usuarios` falla con 23503 ("Key is not present in table usuarios").
--
-- Solución: reapuntar el FK a `entrenadores(id)`, hacer la columna
-- nullable (la fuente de verdad pasa a ser la pivote) y limpiar
-- datos legacy huérfanos.
-- ============================================================

-- 1) Eliminar el FK incorrecto (contra usuarios).
ALTER TABLE public.sesiones
    DROP CONSTRAINT IF EXISTS sesiones_entrenador_id_fkey;

-- 2) Hacer la columna NULLABLE (antes NOT NULL por la migración 001).
ALTER TABLE public.sesiones
    ALTER COLUMN entrenador_id DROP NOT NULL;

-- 3) Limpiar datos legacy: cualquier entrenador_id que no exista en
--    `entrenadores` (apuntaba al modelo viejo `usuarios`) se pone a NULL
--    para que el nuevo FK pueda validarse.
UPDATE public.sesiones s
SET entrenador_id = NULL
WHERE s.entrenador_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.entrenadores e WHERE e.id = s.entrenador_id
  );

-- 4) Crear el FK correcto contra `entrenadores`.
ALTER TABLE public.sesiones
    ADD CONSTRAINT sesiones_entrenador_id_fkey
    FOREIGN KEY (entrenador_id)
    REFERENCES public.entrenadores(id)
    ON DELETE SET NULL;

COMMIT;
