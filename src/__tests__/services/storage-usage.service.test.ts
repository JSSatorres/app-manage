import { beforeEach, describe, expect, it, vi } from "vitest"

type QueryResponse = { data: unknown; error: unknown }

interface RecordedCall {
  table: string
  selectFields: string
  eqCalls: [string, unknown][]
  orderCalls: [string, { ascending?: boolean } | undefined][]
}

function createSupabaseMock(responses: Record<string, QueryResponse>) {
  const calls: RecordedCall[] = []

  function makeBuilder(table: string) {
    const call: RecordedCall = { table, selectFields: "", eqCalls: [], orderCalls: [] }
    calls.push(call)
    const builder: Record<string, unknown> = {
      select: vi.fn((fields: string) => {
        call.selectFields = fields
        return builder
      }),
      eq: vi.fn((field: string, value: unknown) => {
        call.eqCalls.push([field, value])
        return builder
      }),
      order: vi.fn((field: string, options?: { ascending?: boolean }) => {
        call.orderCalls.push([field, options])
        return builder
      }),
      maybeSingle: vi.fn(async () => responses[table]),
      then: (resolve: (value: QueryResponse) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve(responses[table]).then(resolve, reject),
    }
    return builder
  }

  return { from: vi.fn((table: string) => makeBuilder(table)), calls }
}

vi.mock("@/services/supabase", () => ({ getSupabaseClient: vi.fn() }))

import { getSupabaseClient } from "@/services/supabase"

const WORKSPACE_ID = "workspace-1"

beforeEach(() => vi.clearAllMocks())

describe("storage-usage.service", () => {
  it("lee el uso, entitlement y catálogo activo con campos explícitos", async () => {
    const { from, calls } = createSupabaseMock({
      workspace_storage_usage: {
        data: {
          workspace_id: WORKSPACE_ID,
          used_bytes: 7_900,
          reserved_bytes: 100,
          limit_bytes: 10_000,
          version: 4,
          updated_at: "2026-08-09T10:00:00.000Z",
        },
        error: null,
      },
      workspace_entitlements: {
        data: [{
          id: "entitlement-base",
          workspace_id: WORKSPACE_ID,
          entitlement_key: "base_storage_10_gib",
          capacity_bytes: 10_737_418_240,
          status: "active",
          source: "migration",
          starts_at: "2026-08-01T00:00:00.000Z",
          ends_at: null,
          accepted_catalog_item_id: null,
          created_at: "2026-08-01T00:00:00.000Z",
          updated_at: "2026-08-01T00:00:00.000Z",
          created_by: null,
        }],
        error: null,
      },
      storage_upgrade_catalog: {
        data: [{
          id: "catalog-10",
          code: "extra_10_gib",
          name: "+10 GB",
          capacity_bytes: 10_737_418_240,
          monthly_price_minor: 300,
          currency_code: "EUR",
          sort_order: 10,
          is_active: true,
          created_at: "2026-08-01T00:00:00.000Z",
          updated_at: "2026-08-01T00:00:00.000Z",
        }],
        error: null,
      },
    })
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never)

    const { fetchStorageUsage } = await import("@/services/storage-usage.service")
    const result = await fetchStorageUsage(WORKSPACE_ID)

    expect(calls.find((call) => call.table === "workspace_storage_usage")).toMatchObject({
      selectFields: "workspace_id,used_bytes,reserved_bytes,limit_bytes,version,updated_at",
      eqCalls: [["workspace_id", WORKSPACE_ID]],
    })
    expect(calls.find((call) => call.table === "workspace_entitlements")).toMatchObject({
      selectFields: "id,workspace_id,entitlement_key,capacity_bytes,status,source,starts_at,ends_at,accepted_catalog_item_id",
      eqCalls: [["workspace_id", WORKSPACE_ID], ["status", "active"]],
    })
    expect(calls.find((call) => call.table === "storage_upgrade_catalog")).toMatchObject({
      selectFields: "id,code,name,capacity_bytes,monthly_price_minor,currency_code,sort_order,is_active",
      eqCalls: [["is_active", true]],
      orderCalls: [["sort_order", { ascending: true }]],
    })
    expect(result).toMatchObject({
      data: {
        usage: {
          workspaceId: WORKSPACE_ID,
          usedBytes: 7_900,
          reservedBytes: 100,
          occupiedBytes: 8_000,
          realPercent: 80,
          percent: 80,
          state: "warning",
        },
        includedCapacityBytes: 10_737_418_240,
        upgrades: [{ id: "catalog-10", monthlyPriceMinor: 300, currencyCode: "EUR" }],
      },
      error: null,
    })
  })

  it("no expone elementos inactivos aunque los devuelva el backend", async () => {
    const { from } = createSupabaseMock({
      workspace_storage_usage: {
        data: { workspace_id: WORKSPACE_ID, used_bytes: 0, reserved_bytes: 0, limit_bytes: 1, version: 0, updated_at: "2026-08-09T10:00:00.000Z" },
        error: null,
      },
      workspace_entitlements: { data: [], error: null },
      storage_upgrade_catalog: {
        data: [{
          id: "catalog-inactive",
          code: "extra_10_gib",
          name: "+10 GB",
          capacity_bytes: 10_737_418_240,
          monthly_price_minor: 300,
          currency_code: "EUR",
          sort_order: 10,
          is_active: false,
        }],
        error: null,
      },
    })
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never)

    const { fetchStorageUsage } = await import("@/services/storage-usage.service")
    const result = await fetchStorageUsage(WORKSPACE_ID)

    expect(result.data?.upgrades).toEqual([])
  })

  it("devuelve un error controlado si Supabase no está configurado", async () => {
    vi.mocked(getSupabaseClient).mockReturnValue(null)

    const { fetchStorageUsage } = await import("@/services/storage-usage.service")
    const result = await fetchStorageUsage(WORKSPACE_ID)

    expect(result.data).toBeNull()
    expect(result.error).toBeInstanceOf(Error)
  })
})
