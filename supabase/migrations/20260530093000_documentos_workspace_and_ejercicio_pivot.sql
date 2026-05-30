-- Alinea la BD con el código de gestión de documentos (commit e6494a0 y posteriores):
--   1) documentos.workspace_id  → documentos globales del club (nullable)
--   2) documentos.source_type   → 'file' (archivo en Storage) | 'link' (URL externa)
--   3) documentos.external_url   → URL del recurso externo (YouTube, Vimeo, web…)
--   4) ejercicio_documentos      → vincular documentos a ejercicios (many-to-many)
-- Idempotente: se puede re-ejecutar sin errores.

BEGIN;

-- ============================================
-- 1) documentos.workspace_id (nullable = global / sin workspace)
-- ============================================
ALTER TABLE public.documentos
    ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Backfill: deducir el workspace desde la sede principal del documento.
UPDATE public.documentos d
SET workspace_id = s.workspace_id
FROM public.sedes s
WHERE d.sede_id = s.id
  AND d.workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_documentos_workspace ON public.documentos(workspace_id);

-- ============================================
-- 2) documentos.source_type ('file' | 'link')
-- ============================================
ALTER TABLE public.documentos
    ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'file';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'documentos_source_type_check'
    ) THEN
        ALTER TABLE public.documentos
            ADD CONSTRAINT documentos_source_type_check
            CHECK (source_type IN ('file', 'link'));
    END IF;
END $$;

-- ============================================
-- 3) documentos.external_url (URL externa, nullable)
-- ============================================
ALTER TABLE public.documentos
    ADD COLUMN IF NOT EXISTS external_url text;

-- ============================================
-- 4) ejercicio_documentos (pivote ejercicio ↔ documento)
-- ============================================
CREATE TABLE IF NOT EXISTS public.ejercicio_documentos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ejercicio_id uuid NOT NULL REFERENCES public.ejercicios(id) ON DELETE CASCADE,
    documento_id uuid NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE (ejercicio_id, documento_id)
);

CREATE INDEX IF NOT EXISTS idx_ejercicio_documentos_ejercicio ON public.ejercicio_documentos(ejercicio_id);
CREATE INDEX IF NOT EXISTS idx_ejercicio_documentos_documento ON public.ejercicio_documentos(documento_id);

ALTER TABLE public.ejercicio_documentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_ejercicio_documentos" ON public.ejercicio_documentos;
CREATE POLICY "allow_all_ejercicio_documentos" ON public.ejercicio_documentos FOR ALL USING (true) WITH CHECK (true);

COMMIT;
