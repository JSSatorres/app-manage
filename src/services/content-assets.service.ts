import { normalizeContentAssetLink } from "@/lib/contentAssetLinks"
import { getSupabaseClient } from "@/services/supabase"
import type {
  ContentAsset,
  ContentAssetStatus,
  ContentProvider,
  GoogleDriveContentAsset,
  YouTubeContentAsset,
} from "@/types/content-assets"

const MISSING_CLIENT = new Error(
  "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
)

const SELECT_FIELDS =
  "id,workspace_id,provider,status,original_url,external_resource_id,embed_url,storage_path,size_bytes,mime_type,checksum,created_by,created_at,updated_at"

const PROVIDERS: readonly ContentProvider[] = [
  "youtube",
  "google_drive",
  "supabase_storage",
  "external_legacy",
]

const STATUSES: readonly ContentAssetStatus[] = [
  "pending_validation",
  "reserved",
  "uploading",
  "processing",
  "ready",
  "unavailable",
  "rejected",
  "failed",
  "deleting",
  "deleted",
]

const EXTERNAL_PROVIDERS = ["youtube", "google_drive"] as const

type ManagedExternalContentAsset =
  | YouTubeContentAsset
  | (GoogleDriveContentAsset & {
      externalResourceId: string
      fileId: string
    })

export interface CreateExternalContentAssetInput {
  workspaceId: string
  url: string
}

export interface ExternalContentAssetValidation {
  hasAccess: boolean
  embedAvailable: boolean
  providerAccepted?: boolean
}

interface ContentAssetRow {
  id: string
  workspace_id: string
  provider: string
  status: string
  original_url: string | null
  external_resource_id: string | null
  embed_url: string | null
  storage_path: string | null
  size_bytes: number
  mime_type: string | null
  checksum: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ContentAssetsFilters {
  provider?: ContentProvider | null
  sedeId?: string | null
  assetIds?: readonly string[]
}

export interface ContentAssetsPagination {
  limit: number
  offset: number
}

export interface ContentAssetsCatalog {
  assets: ContentAsset[]
  hasProviderDataInWorkspace: boolean
}

function isContentProvider(value: string): value is ContentProvider {
  return PROVIDERS.includes(value as ContentProvider)
}

function isContentAssetStatus(value: string): value is ContentAssetStatus {
  return STATUSES.includes(value as ContentAssetStatus)
}

function mapContentAsset(row: ContentAssetRow): ContentAsset | null {
  if (!isContentProvider(row.provider) || !isContentAssetStatus(row.status)) {
    return null
  }

  const base = {
    id: row.id,
    workspaceId: row.workspace_id,
    status: row.status,
    originalUrl: row.original_url,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }

  switch (row.provider) {
    case "youtube":
      return row.external_resource_id && row.embed_url
        ? {
            ...base,
            provider: "youtube",
            externalResourceId: row.external_resource_id,
            embedUrl: row.embed_url,
          }
        : null
    case "google_drive":
      return {
        ...base,
        provider: "google_drive",
        externalResourceId: row.external_resource_id,
        fileId: row.external_resource_id,
      }
    case "supabase_storage":
      return row.storage_path && row.mime_type
        ? {
            ...base,
            provider: "supabase_storage",
            storagePath: row.storage_path,
            sizeBytes: row.size_bytes,
            mimeType: row.mime_type,
          }
        : null
    case "external_legacy":
      return row.original_url
        ? { ...base, provider: "external_legacy", originalUrl: row.original_url }
        : null
  }
}

function getManagedExternalContentAsset(
  url: string,
): ManagedExternalContentAsset | null {
  const normalized = normalizeContentAssetLink(url)
  if (!normalized) return null
  if (normalized.provider === "youtube") return normalized
  if (
    normalized.provider === "google_drive" &&
    normalized.externalResourceId &&
    normalized.fileId
  ) {
    return {
      ...normalized,
      externalResourceId: normalized.externalResourceId,
      fileId: normalized.fileId,
    }
  }
  return null
}

function getValidatedExternalAssetStatus(
  validation: ExternalContentAssetValidation,
): "ready" | "unavailable" | "rejected" {
  if (validation.providerAccepted === false) return "rejected"
  if (!validation.hasAccess || !validation.embedAvailable) return "unavailable"
  return "ready"
}

function getMappedContentAsset(
  row: ContentAssetRow | null,
  fallbackMessage: string,
) {
  const asset = row ? mapContentAsset(row) : null
  return asset
    ? { data: asset, error: null }
    : { data: null, error: new Error(fallbackMessage) }
}

export async function createExternalContentAsset(
  input: CreateExternalContentAssetInput,
) {
  const normalized = getManagedExternalContentAsset(input.url)
  if (!normalized) {
    return {
      data: null,
      error: new Error("Introduce un enlace HTTPS de YouTube o Google Drive"),
    }
  }

  const supabase = getSupabaseClient()
  if (!supabase) return { data: null, error: MISSING_CLIENT }

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) {
    return {
      data: null,
      error: authError ?? new Error("Debes iniciar sesión para crear un enlace"),
    }
  }

  const { data: existingRow, error: existingError } = await supabase
    .from("content_assets")
    .select(SELECT_FIELDS)
    .eq("workspace_id", input.workspaceId)
    .eq("provider", normalized.provider)
    .eq("external_resource_id", normalized.externalResourceId)
    .maybeSingle()
  if (existingError) return { data: null, error: existingError }
  if (existingRow) {
    return getMappedContentAsset(
      existingRow,
      "El activo externo existente no tiene un formato válido",
    )
  }

  const { data, error } = await supabase
    .from("content_assets")
    .insert({
      workspace_id: input.workspaceId,
      provider: normalized.provider,
      status: "pending_validation",
      original_url: normalized.canonicalUrl,
      external_resource_id: normalized.externalResourceId,
      embed_url: normalized.provider === "youtube" ? normalized.embedUrl : null,
      created_by: authData.user.id,
    })
    .select(SELECT_FIELDS)
    .single()
  if (error) return { data: null, error }

  return getMappedContentAsset(data, "No se pudo crear el enlace externo")
}

export async function validateExternalContentAsset(
  assetId: string,
  validation: ExternalContentAssetValidation,
) {
  const supabase = getSupabaseClient()
  if (!supabase) return { data: null, error: MISSING_CLIENT }

  const status = getValidatedExternalAssetStatus(validation)
  const { data, error } = await supabase
    .from("content_assets")
    .update({ status })
    .eq("id", assetId)
    .eq("status", "pending_validation")
    .in("provider", EXTERNAL_PROVIDERS)
    .select(SELECT_FIELDS)
    .single()
  if (error) return { data: null, error }

  return getMappedContentAsset(data, "No se pudo validar el enlace externo")
}

async function fetchAssetIdsBySede(workspaceId: string, sedeId: string) {
  const supabase = getSupabaseClient()
  if (!supabase) return { data: null, error: MISSING_CLIENT }

  const { data: pivotRows, error: pivotError } = await supabase
    .from("documento_sedes")
    .select("documento_id")
    .eq("sede_id", sedeId)
  if (pivotError) return { data: null, error: pivotError }

  const pivotDocumentoIds = (pivotRows ?? []).map((row) => row.documento_id)
  const [pivotDocumentsResult, legacyDocumentsResult] = await Promise.all([
    pivotDocumentoIds.length > 0
      ? supabase
          .from("documentos")
          .select("content_asset_id")
          .eq("workspace_id", workspaceId)
          .in("id", pivotDocumentoIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("documentos")
      .select("content_asset_id")
      .eq("workspace_id", workspaceId)
      .eq("sede_id", sedeId),
  ])

  const error = pivotDocumentsResult.error ?? legacyDocumentsResult.error
  if (error) return { data: null, error }

  const assetIds = new Set<string>()
  for (const document of [...(pivotDocumentsResult.data ?? []), ...(legacyDocumentsResult.data ?? [])]) {
    if (document.content_asset_id) assetIds.add(document.content_asset_id)
  }
  return { data: [...assetIds], error: null }
}

async function hasProviderDataInWorkspace(
  workspaceId: string,
  provider: ContentProvider | null | undefined,
) {
  if (!provider) return { data: false, error: null }

  const supabase = getSupabaseClient()
  if (!supabase) return { data: null, error: MISSING_CLIENT }

  const { data, error } = await supabase
    .from("content_assets")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)

  return { data: (data ?? []).length > 0, error }
}

export async function fetchContentAssets(
  workspaceId: string,
  filters: ContentAssetsFilters = {},
  pagination?: ContentAssetsPagination,
) {
  const supabase = getSupabaseClient()
  if (!supabase) return { data: null, error: MISSING_CLIENT, count: null }

  const assetIdsResult = filters.assetIds
    ? { data: [...new Set(filters.assetIds)], error: null }
    : filters.sedeId
      ? await fetchAssetIdsBySede(workspaceId, filters.sedeId)
      : { data: null, error: null }
  if (assetIdsResult.error) return { data: null, error: assetIdsResult.error, count: null }
  if (assetIdsResult.data?.length === 0) {
    const providerDataResult = await hasProviderDataInWorkspace(
      workspaceId,
      filters.provider,
    )
    if (providerDataResult.error) {
      return { data: null, error: providerDataResult.error, count: null }
    }
    return {
      data: {
        assets: [],
        hasProviderDataInWorkspace: providerDataResult.data ?? false,
      },
      error: null,
      count: 0,
    }
  }

  let query = supabase
    .from("content_assets")
    .select(SELECT_FIELDS, { count: "exact" })
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })

  if (filters.provider) query = query.eq("provider", filters.provider)
  if (assetIdsResult.data) query = query.in("id", assetIdsResult.data)
  if (pagination) {
    query = query.range(pagination.offset, pagination.offset + pagination.limit - 1)
  }

  const { data, error, count } = await query
  if (error) return { data: null, error, count: null }

  const providerDataResult = await hasProviderDataInWorkspace(
    workspaceId,
    filters.provider,
  )
  if (providerDataResult.error) {
    return { data: null, error: providerDataResult.error, count: null }
  }

  return {
    data: {
      assets: (data ?? [])
        .map((row) => mapContentAsset(row))
        .filter((asset): asset is ContentAsset => asset !== null),
      hasProviderDataInWorkspace: providerDataResult.data ?? false,
    },
    error: null,
    count: count ?? null,
  }
}
