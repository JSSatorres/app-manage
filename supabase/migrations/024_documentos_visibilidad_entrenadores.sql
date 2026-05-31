-- Migración 024: visibilidad de documentos para entrenadores
--
-- Añade:
-- 1. columna `visible_entrenadores` en tabla `documentos` (bool, default false)
-- 2. tabla pivote `documento_entrenadores` para asignar a entrenadores específicos

-- 1. Columna de visibilidad global para entrenadores
ALTER TABLE documentos
  ADD COLUMN IF NOT EXISTS visible_entrenadores BOOLEAN NOT NULL DEFAULT false;

-- 2. Tabla pivote: documento visible para entrenadores específicos (por user_id del entrenador)
CREATE TABLE IF NOT EXISTS documento_entrenadores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id  UUID NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  entrenador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(documento_id, entrenador_id)
);

CREATE INDEX IF NOT EXISTS idx_documento_entrenadores_documento ON documento_entrenadores(documento_id);
CREATE INDEX IF NOT EXISTS idx_documento_entrenadores_entrenador ON documento_entrenadores(entrenador_id);

-- RLS para documento_entrenadores
ALTER TABLE documento_entrenadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_authenticated_documento_entrenadores"
  ON documento_entrenadores
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
