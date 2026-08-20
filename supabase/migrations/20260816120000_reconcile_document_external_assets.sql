-- Reconciliación idempotente de documentos externos gestionados creados tras el backfill inicial.
-- Alcance: solo documentos con workspace_id y content_asset_id NULL; no toca external_legacy.
-- Recuperación: antes de aplicar, conservar la salida de la consulta de candidatas del gate para
-- revertir exclusivamente esos documento_id y eliminar solo assets nuevos sin referencias.

BEGIN;

WITH candidate_documents AS (
  SELECT
    document.id,
    document.workspace_id,
    trim(document.external_url) AS external_url
  FROM public.documentos AS document
  WHERE document.workspace_id IS NOT NULL
    AND document.content_asset_id IS NULL
    AND document.external_url IS NOT NULL
), parsed_documents AS (
  SELECT
    document.id,
    document.workspace_id,
    CASE
      WHEN document.external_url ~* '^https://(?:www\.|m\.)?youtu\.be/'
        OR document.external_url ~* '^https://(?:www\.|m\.)?youtube\.com/'
        THEN 'youtube'
      WHEN document.external_url ~* '^https://(?:www\.)?drive\.google\.com/'
        THEN 'google_drive'
      ELSE NULL
    END AS provider,
    CASE
      WHEN document.external_url ~* '^https://(?:www\.)?youtu\.be/' THEN
        substring(document.external_url FROM '(?i)^https://(?:www\.)?youtu\.be/([A-Za-z0-9_-]{11})(?:[/?#]|$)')
      WHEN document.external_url ~* '^https://(?:www\.|m\.)?youtube\.com/shorts/' THEN
        substring(document.external_url FROM '(?i)^https://(?:www\.|m\.)?youtube\.com/shorts/([A-Za-z0-9_-]{11})(?:[/?#]|$)')
      WHEN document.external_url ~* '^https://(?:www\.|m\.)?youtube\.com/' THEN
        substring(document.external_url FROM '(?i)[?&]v=([A-Za-z0-9_-]{11})(?:[&#]|$)')
      WHEN document.external_url ~* '^https://(?:www\.)?drive\.google\.com/file/d/' THEN
        substring(document.external_url FROM '(?i)^https://(?:www\.)?drive\.google\.com/file/d/([A-Za-z0-9_-]{10,})(?:/|$)')
      WHEN document.external_url ~* '^https://(?:www\.)?drive\.google\.com/(?:open|uc)(?:\?|$)' THEN
        substring(document.external_url FROM '(?i)[?&]id=([A-Za-z0-9_-]{10,})(?:[&#]|$)')
      ELSE NULL
    END AS external_resource_id
  FROM candidate_documents AS document
), normalized_documents AS (
  SELECT
    document.id,
    document.workspace_id,
    document.provider,
    document.external_resource_id,
    CASE document.provider
      WHEN 'youtube' THEN 'https://www.youtube.com/watch?v=' || document.external_resource_id
      WHEN 'google_drive' THEN 'https://drive.google.com/file/d/' || document.external_resource_id || '/view'
    END AS original_url,
    CASE document.provider
      WHEN 'youtube' THEN 'https://www.youtube-nocookie.com/embed/' || document.external_resource_id
      ELSE NULL
    END AS embed_url
  FROM parsed_documents AS document
  WHERE document.provider IN ('youtube', 'google_drive')
    AND document.external_resource_id IS NOT NULL
), distinct_resources AS (
  SELECT DISTINCT
    document.workspace_id,
    document.provider,
    document.external_resource_id,
    document.original_url,
    document.embed_url
  FROM normalized_documents AS document
), existing_assets AS (
  SELECT
    resource.workspace_id,
    resource.provider,
    resource.external_resource_id,
    (
      SELECT asset.id
      FROM public.content_assets AS asset
      WHERE asset.workspace_id = resource.workspace_id
        AND asset.provider = resource.provider
        AND asset.external_resource_id = resource.external_resource_id
      ORDER BY asset.created_at ASC, asset.id ASC
      LIMIT 1
    ) AS id
  FROM distinct_resources AS resource
), inserted_assets AS (
  INSERT INTO public.content_assets (
    workspace_id,
    provider,
    status,
    original_url,
    external_resource_id,
    embed_url
  )
  SELECT
    resource.workspace_id,
    resource.provider,
    'pending_validation',
    resource.original_url,
    resource.external_resource_id,
    resource.embed_url
  FROM distinct_resources AS resource
  JOIN existing_assets AS asset
    ON asset.workspace_id = resource.workspace_id
    AND asset.provider = resource.provider
    AND asset.external_resource_id = resource.external_resource_id
  WHERE asset.id IS NULL
  RETURNING id, workspace_id, provider, external_resource_id
), resolved_assets AS (
  SELECT id, workspace_id, provider, external_resource_id
  FROM existing_assets
  WHERE id IS NOT NULL

  UNION ALL

  SELECT id, workspace_id, provider, external_resource_id
  FROM inserted_assets
)
UPDATE public.documentos AS document
SET content_asset_id = asset.id
FROM normalized_documents AS normalized_document
JOIN resolved_assets AS asset
  ON asset.workspace_id = normalized_document.workspace_id
  AND asset.provider = normalized_document.provider
  AND asset.external_resource_id = normalized_document.external_resource_id
WHERE document.id = normalized_document.id
  AND document.workspace_id = normalized_document.workspace_id
  AND document.content_asset_id IS NULL;

COMMIT;
