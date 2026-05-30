-- ============================================================
-- MIGRACIÓN 019: Snapshot del esquema real (reconciliación)
-- ============================================================
-- Las migraciones 015–018 quedaron como placeholders vacíos (SELECT 1) y el
-- esquema real de la gestión de documentos se creó directamente en la BD remota,
-- nunca en el repo. Esta migración DOCUMENTA ese estado para que el repositorio
-- vuelva a ser fuente de verdad.
--
-- Es 100% idempotente (CREATE ... IF NOT EXISTS / ADD COLUMN IF NOT EXISTS):
-- aplicarla contra la BD real NO altera datos ni rompe nada, solo alinea el
-- historial de migraciones con lo que ya existe.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Columnas de documentos (storage, enlaces/vídeo, workspace, permisos)
-- ------------------------------------------------------------
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS storage_path   text;
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS file_name      text;
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS mime_type      text;
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS size_bytes     bigint;
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS extension      text;
-- source_type: 'file' (Storage) | 'link' (URL externa: YouTube/Vimeo/web…)
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS source_type    text DEFAULT 'file';
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS external_url   text;
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS permisos_roles jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_documentos_workspace ON public.documentos(workspace_id);

-- ------------------------------------------------------------
-- Pivote documento ↔ sede (un documento puede compartirse en varias sedes)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documento_sedes (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id uuid NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
    sede_id      uuid NOT NULL REFERENCES public.sedes(id) ON DELETE CASCADE,
    created_at   timestamptz DEFAULT now(),
    UNIQUE (documento_id, sede_id)
);

CREATE INDEX IF NOT EXISTS idx_documento_sedes_documento ON public.documento_sedes(documento_id);
CREATE INDEX IF NOT EXISTS idx_documento_sedes_sede      ON public.documento_sedes(sede_id);

-- ------------------------------------------------------------
-- Pivote documento ↔ equipo
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documento_equipos (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id uuid NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
    equipo_id    uuid NOT NULL REFERENCES public.equipos(id) ON DELETE CASCADE,
    created_at   timestamptz DEFAULT now(),
    UNIQUE (documento_id, equipo_id)
);

CREATE INDEX IF NOT EXISTS idx_documento_equipos_documento ON public.documento_equipos(documento_id);
CREATE INDEX IF NOT EXISTS idx_documento_equipos_equipo    ON public.documento_equipos(equipo_id);

-- ------------------------------------------------------------
-- Pivote sesión ↔ documento (documentos adjuntos a una sesión)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sesion_documentos (
    sesion_id    uuid NOT NULL REFERENCES public.sesiones(id) ON DELETE CASCADE,
    documento_id uuid NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
    created_at   timestamptz DEFAULT now(),
    PRIMARY KEY (sesion_id, documento_id)
);

CREATE INDEX IF NOT EXISTS idx_sesion_documentos_sesion    ON public.sesion_documentos(sesion_id);
CREATE INDEX IF NOT EXISTS idx_sesion_documentos_documento ON public.sesion_documentos(documento_id);

-- ------------------------------------------------------------
-- RLS: habilitar y abrir a usuarios autenticados (el filtrado fino por sede/rol
-- se consolida en 021). Idempotente.
-- ------------------------------------------------------------
ALTER TABLE public.documento_sedes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documento_equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesion_documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documento_sedes_all"   ON public.documento_sedes;
DROP POLICY IF EXISTS "documento_equipos_all" ON public.documento_equipos;
DROP POLICY IF EXISTS "sesion_documentos_all" ON public.sesion_documentos;

CREATE POLICY "documento_sedes_all"   ON public.documento_sedes   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "documento_equipos_all" ON public.documento_equipos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "sesion_documentos_all" ON public.sesion_documentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMIT;
