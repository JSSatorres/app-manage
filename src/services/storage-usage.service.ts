import {
  calculateStorageUsage,
  type StorageUsageCalculation,
} from "@/lib/storagePricing"
import { getSupabaseClient } from "@/services/supabase"
import type { Database } from "@/types/database.types"

type StorageUsageRow = Pick<
  Database["public"]["Tables"]["workspace_storage_usage"]["Row"],
  "workspace_id" | "used_bytes" | "reserved_bytes" | "limit_bytes" | "version" | "updated_at"
>
type StorageEntitlementRow = Pick<
  Database["public"]["Tables"]["workspace_entitlements"]["Row"],
  | "id"
  | "workspace_id"
  | "entitlement_key"
  | "capacity_bytes"
  | "status"
  | "source"
  | "starts_at"
  | "ends_at"
  | "accepted_catalog_item_id"
>
type StorageUpgradeCatalogRow = Pick<
  Database["public"]["Tables"]["storage_upgrade_catalog"]["Row"],
  | "id"
  | "code"
  | "name"
  | "capacity_bytes"
  | "monthly_price_minor"
  | "currency_code"
  | "sort_order"
  | "is_active"
>

const STORAGE_USAGE_SELECT_FIELDS =
  "workspace_id,used_bytes,reserved_bytes,limit_bytes,version,updated_at"
const STORAGE_ENTITLEMENTS_SELECT_FIELDS =
  "id,workspace_id,entitlement_key,capacity_bytes,status,source,starts_at,ends_at,accepted_catalog_item_id"
const STORAGE_UPGRADE_CATALOG_SELECT_FIELDS =
  "id,code,name,capacity_bytes,monthly_price_minor,currency_code,sort_order,is_active"
const BASE_STORAGE_ENTITLEMENT_KEY = "base_storage_10_gib"

export interface StorageUsage extends StorageUsageCalculation {
  workspaceId: string
  usedBytes: number
  reservedBytes: number
  limitBytes: number
  version: number
  updatedAt: string
}

export interface StorageEntitlement {
  id: string
  workspaceId: string
  entitlementKey: string
  capacityBytes: number
  status: string
  source: string
  startsAt: string
  endsAt: string | null
  acceptedCatalogItemId: string | null
}

export interface StorageUpgradeCatalogItem {
  id: string
  code: string
  name: string
  capacityBytes: number
  monthlyPriceMinor: number
  currencyCode: string
  sortOrder: number
}

export interface StorageUsageData {
  usage: StorageUsage
  includedCapacityBytes: number
  entitlements: StorageEntitlement[]
  upgrades: StorageUpgradeCatalogItem[]
}

function missingSupabaseClientError() {
  return new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
}

function mapStorageUsage(row: StorageUsageRow): StorageUsage {
  return {
    workspaceId: row.workspace_id,
    usedBytes: row.used_bytes,
    reservedBytes: row.reserved_bytes,
    limitBytes: row.limit_bytes,
    version: row.version,
    updatedAt: row.updated_at,
    ...calculateStorageUsage({
      usedBytes: row.used_bytes,
      reservedBytes: row.reserved_bytes,
      limitBytes: row.limit_bytes,
    }),
  }
}

function mapStorageEntitlement(row: StorageEntitlementRow): StorageEntitlement {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    entitlementKey: row.entitlement_key,
    capacityBytes: row.capacity_bytes,
    status: row.status,
    source: row.source,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    acceptedCatalogItemId: row.accepted_catalog_item_id,
  }
}

function mapStorageUpgradeCatalogItem(row: StorageUpgradeCatalogRow): StorageUpgradeCatalogItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    capacityBytes: row.capacity_bytes,
    monthlyPriceMinor: row.monthly_price_minor,
    currencyCode: row.currency_code,
    sortOrder: row.sort_order,
  }
}

export async function fetchStorageUsage(workspaceId: string) {
  const supabase = getSupabaseClient()
  if (!supabase) return { data: null, error: missingSupabaseClientError() }

  const [usageResult, entitlementsResult, catalogResult] = await Promise.all([
    supabase
      .from("workspace_storage_usage")
      .select(STORAGE_USAGE_SELECT_FIELDS)
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
    supabase
      .from("workspace_entitlements")
      .select(STORAGE_ENTITLEMENTS_SELECT_FIELDS)
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .order("starts_at", { ascending: true }),
    supabase
      .from("storage_upgrade_catalog")
      .select(STORAGE_UPGRADE_CATALOG_SELECT_FIELDS)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ])

  const error = usageResult.error ?? entitlementsResult.error ?? catalogResult.error
  if (error) return { data: null, error }
  if (!usageResult.data) return { data: null, error: null }

  const entitlements = (entitlementsResult.data ?? []).map(mapStorageEntitlement)
  const baseEntitlement = entitlements.find(
    (entitlement) => entitlement.entitlementKey === BASE_STORAGE_ENTITLEMENT_KEY,
  )
  const upgrades = (catalogResult.data ?? [])
    .filter((item) => item.is_active)
    .map(mapStorageUpgradeCatalogItem)

  return {
    data: {
      usage: mapStorageUsage(usageResult.data),
      includedCapacityBytes: baseEntitlement?.capacityBytes ?? 0,
      entitlements,
      upgrades,
    },
    error: null,
  }
}
