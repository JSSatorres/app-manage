import { storageUpgradeRequestSchema, type StorageUpgradeRequestInput } from "@/schemas/storage-upgrade.schema"
import { getSupabaseClient } from "@/services/supabase"
import type { Database } from "@/types/database.types"

type StorageUpgradeRequestRow = Pick<
  Database["public"]["Tables"]["storage_upgrade_requests"]["Row"],
  | "id"
  | "workspace_id"
  | "catalog_item_id"
  | "requested_capacity_bytes"
  | "monthly_price_minor"
  | "currency_code"
  | "status"
  | "requested_by"
  | "requested_at"
  | "notes"
>

const STORAGE_UPGRADE_REQUEST_SELECT_FIELDS =
  "id,workspace_id,catalog_item_id,requested_capacity_bytes,monthly_price_minor,currency_code,status,requested_by,requested_at,notes"

export const STORAGE_UPGRADE_CONFIRMATION_MESSAGE =
  "Solicitud enviada; la ampliaciÃ³n se activa tras confirmaciÃ³n"

export interface StorageUpgradeRequest {
  id: string
  workspaceId: string
  catalogItemId: string
  requestedCapacityBytes: number
  monthlyPriceMinor: number
  currencyCode: string
  status: string
  requestedBy: string
  requestedAt: string
  notes: string | null
}

export interface StorageUpgradeRequestResult {
  request: StorageUpgradeRequest
  message: string
  isExisting: boolean
}

function missingSupabaseClientError() {
  return new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
}

function mapStorageUpgradeRequest(row: StorageUpgradeRequestRow): StorageUpgradeRequest {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    catalogItemId: row.catalog_item_id,
    requestedCapacityBytes: row.requested_capacity_bytes,
    monthlyPriceMinor: row.monthly_price_minor,
    currencyCode: row.currency_code,
    status: row.status,
    requestedBy: row.requested_by,
    requestedAt: row.requested_at,
    notes: row.notes,
  }
}

export async function fetchStorageUpgradeRequests(workspaceId: string) {
  const supabase = getSupabaseClient()
  if (!supabase) return { data: null, error: missingSupabaseClientError() }

  const { data, error } = await supabase
    .from("storage_upgrade_requests")
    .select(STORAGE_UPGRADE_REQUEST_SELECT_FIELDS)
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .order("requested_at", { ascending: false })

  return {
    data: data ? data.map(mapStorageUpgradeRequest) : null,
    error,
  }
}

export async function requestStorageUpgrade(input: StorageUpgradeRequestInput) {
  const parsedInput = storageUpgradeRequestSchema.safeParse(input)
  if (!parsedInput.success) return { data: null, error: parsedInput.error }

  const supabase = getSupabaseClient()
  if (!supabase) return { data: null, error: missingSupabaseClientError() }

  const { workspaceId, catalogItemId, notes } = parsedInput.data
  const { data, error } = await supabase.rpc("request_storage_upgrade", {
    p_workspace_id: workspaceId,
    p_catalog_item_id: catalogItemId,
    p_notes: notes ?? undefined,
  })
  const request = data?.[0]
  if (error || !request) {
    return { data: null, error: error ?? new Error("No se pudo crear la solicitud") }
  }

  return {
    data: {
      request: mapStorageUpgradeRequest(request),
      message: STORAGE_UPGRADE_CONFIRMATION_MESSAGE,
      isExisting: request.is_existing,
    },
    error: null,
  }
}
