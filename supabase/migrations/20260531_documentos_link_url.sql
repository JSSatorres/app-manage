-- Documentos tipo enlace: permite almacenar una URL externa (YouTube, Vimeo,
-- Drive, cualquier web) como documento, en lugar de un archivo en Storage.
--   external_url → URL del recurso externo (NULL para documentos de tipo 'file')
--   source_type  → 'file' (archivo en Storage) | 'link' (URL externa)
-- Idempotente: se puede re-ejecutar sin errores.

BEGIN;

ALTER TABLE public.documentos
    ADD COLUMN IF NOT EXISTS external_url text;

ALTER TABLE public.documentos
    ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'file';

-- Backfill defensivo: cualquier fila previa es un archivo.
UPDATE public.documentos
SET source_type = 'file'
WHERE source_type IS NULL;

COMMIT;
