import { z } from "zod"
import { normalizeContentAssetLink } from "@/lib/contentAssetLinks"

export const contentProviderSchema = z.enum([
  "youtube",
  "google_drive",
  "supabase_storage",
  "external_legacy",
])

export const contentAssetStatusSchema = z.enum([
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
])

const contentAssetBaseSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  status: contentAssetStatusSchema,
  originalUrl: z.string().url().nullable(),
  createdBy: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const contentAssetSchema = z.discriminatedUnion("provider", [
  contentAssetBaseSchema.extend({
    provider: z.literal("youtube"),
    externalResourceId: z.string().min(1),
    embedUrl: z.string().url(),
  }),
  contentAssetBaseSchema.extend({
    provider: z.literal("google_drive"),
    externalResourceId: z.string().min(1).nullable(),
    fileId: z.string().min(1).nullable(),
  }),
  contentAssetBaseSchema.extend({
    provider: z.literal("supabase_storage"),
    storagePath: z.string().min(1),
    sizeBytes: z.number().int().nonnegative(),
    mimeType: z.string().min(1),
  }),
  contentAssetBaseSchema.extend({
    provider: z.literal("external_legacy"),
    originalUrl: z.string().url(),
  }),
])

const normalizedExternalLinkSchema = z.string().trim().refine(
  (url) => normalizeContentAssetLink(url) !== null,
  "Introduce una URL HTTPS válida",
)

export const createContentAssetLinkSchema = z.object({
  url: normalizedExternalLinkSchema.refine((url) => {
    const normalized = normalizeContentAssetLink(url)
    return normalized?.provider === "youtube" || normalized?.provider === "google_drive"
  }, "Introduce un enlace HTTPS de YouTube o Google Drive"),
})

export const legacyContentAssetLinkSchema = z.object({
  url: normalizedExternalLinkSchema.refine(
    (url) => normalizeContentAssetLink(url)?.provider === "external_legacy",
    "El enlace heredado debe usar un proveedor externo no gestionado",
  ),
})

export type ContentAssetSchema = z.infer<typeof contentAssetSchema>
export type CreateContentAssetLink = z.infer<typeof createContentAssetLinkSchema>
export type LegacyContentAssetLink = z.infer<typeof legacyContentAssetLinkSchema>
