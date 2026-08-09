export type ContentProvider =
  | "youtube"
  | "google_drive"
  | "supabase_storage"
  | "external_legacy"

export type ContentAssetStatus =
  | "pending_validation"
  | "reserved"
  | "uploading"
  | "processing"
  | "ready"
  | "unavailable"
  | "rejected"
  | "failed"
  | "deleting"
  | "deleted"

export type YouTubeContentAsset = {
  provider: "youtube"
  canonicalUrl: string
  externalResourceId: string
  embedUrl: string
}

export type GoogleDriveContentAsset = {
  provider: "google_drive"
  canonicalUrl: string
  externalResourceId: string | null
  fileId: string | null
}

export type ExternalLegacyContentAsset = {
  provider: "external_legacy"
  canonicalUrl: string
}

export type NormalizedContentAssetLink =
  | YouTubeContentAsset
  | GoogleDriveContentAsset
  | ExternalLegacyContentAsset

type ContentAssetBase = {
  id: string
  workspaceId: string
  status: ContentAssetStatus
  originalUrl: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export type YouTubeContentAssetRecord = ContentAssetBase & {
  provider: "youtube"
  externalResourceId: string
  embedUrl: string
}

export type GoogleDriveContentAssetRecord = ContentAssetBase & {
  provider: "google_drive"
  externalResourceId: string | null
  fileId: string | null
}

export type SupabaseStorageContentAssetRecord = ContentAssetBase & {
  provider: "supabase_storage"
  storagePath: string
  sizeBytes: number
  mimeType: string
}

export type ExternalLegacyContentAssetRecord = ContentAssetBase & {
  provider: "external_legacy"
  originalUrl: string
}

export type ContentAsset =
  | YouTubeContentAssetRecord
  | GoogleDriveContentAssetRecord
  | SupabaseStorageContentAssetRecord
  | ExternalLegacyContentAssetRecord
