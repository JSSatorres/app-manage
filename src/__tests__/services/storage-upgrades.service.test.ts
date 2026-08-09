import { beforeEach, describe, expect, it, vi } from "vitest"

type QueryResponse = { data: unknown; error: unknown }

interface RecordedCall {
  table: string
  selectFields: string
  eqCalls: [string, unknown][]
  insertPayload: unknown | null
}

interface RecordedRpcCall {
  functionName: string
  arguments: Record<string, unknown>
}

function createSupabaseMock(
  responses: Record<string, QueryResponse[]>,
  rpcResponses: QueryResponse[] = [],
) {
  const calls: RecordedCall[] = []
  const rpcCalls: RecordedRpcCall[] = []

  function nextResponse(table: string) {
    return responses[table]?.shift() ?? { data: null, error: null }
  }

  function makeBuilder(table: string) {
    const call: RecordedCall = { table, selectFields: "", eqCalls: [], insertPayload: null }
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
      order: vi.fn(() => builder),
      maybeSingle: vi.fn(async () => nextResponse(table)),
      single: vi.fn(async () => nextResponse(table)),
      insert: vi.fn((payload: unknown) => {
        call.insertPayload = payload
        return builder
      }),
      then: (resolve: (value: QueryResponse) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve(nextResponse(table)).then(resolve, reject),
    }
    return builder
  }

  return {
    from: vi.fn((table: string) => makeBuilder(table)),
    rpc: vi.fn(async (functionName: string, arguments_: Record<string, unknown>) => {
      rpcCalls.push({ functionName, arguments: arguments_ })
      return rpcResponses.shift() ?? { data: null, error: null }
    }),
    calls,
    rpcCalls,
  }
}

vi.mock("@/services/supabase", () => ({ getSupabaseClient: vi.fn() }))

import { getSupabaseClient } from "@/services/supabase"

const WORKSPACE_ID = "d63f95e9-7788-455c-96e0-32e38ed8bec4"
const CATALOG_ITEM_ID = "3ace87ec-b01b-4ce7-8e8e-c7e01ccdf8f1"
const USER_ID = "7082dbdb-4d9e-42c7-9f7a-59c2f4c1ef47"

function upgradeRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: "5909d4bb-7430-4c47-a246-b6a6c67d5183",
    workspace_id: WORKSPACE_ID,
    catalog_item_id: CATALOG_ITEM_ID,
    requested_capacity_bytes: 10_737_418_240,
    monthly_price_minor: 300,
    currency_code: "EUR",
    status: "pending",
    requested_by: USER_ID,
    requested_at: "2026-08-09T10:00:00.000Z",
    notes: null,
    ...overrides,
  }
}

beforeEach(() => vi.clearAllMocks())

describe("storage-upgrades.service", () => {
  it("solicita al servidor una ampliaciÃ³n pendiente con el snapshot actual", async () => {
    const supabase = createSupabaseMock({}, [{
      data: [{ ...upgradeRequest(), is_existing: false }],
      error: null,
    }])
    vi.mocked(getSupabaseClient).mockReturnValue(supabase as never)

    const { requestStorageUpgrade } = await import("@/services/storage-upgrades.service")
    const result = await requestStorageUpgrade({
      workspaceId: WORKSPACE_ID,
      catalogItemId: CATALOG_ITEM_ID,
    })

    expect(supabase.rpcCalls).toEqual([{
      functionName: "request_storage_upgrade",
      arguments: {
        p_workspace_id: WORKSPACE_ID,
        p_catalog_item_id: CATALOG_ITEM_ID,
        p_notes: undefined,
      },
    }])
    expect(supabase.from).not.toHaveBeenCalledWith("storage_upgrade_catalog")
    expect(supabase.from).not.toHaveBeenCalledWith("storage_upgrade_requests")
    expect(result).toMatchObject({
      data: {
        isExisting: false,
        message: "Solicitud enviada; la ampliaciÃ³n se activa tras confirmaciÃ³n",
        request: { monthlyPriceMinor: 300, requestedCapacityBytes: 10_737_418_240 },
      },
      error: null,
    })
  })

  it("devuelve la solicitud pendiente existente sin crear un duplicado", async () => {
    const supabase = createSupabaseMock({}, [{
      data: [{ ...upgradeRequest(), is_existing: true }],
      error: null,
    }])
    vi.mocked(getSupabaseClient).mockReturnValue(supabase as never)

    const { requestStorageUpgrade } = await import("@/services/storage-upgrades.service")
    const result = await requestStorageUpgrade({
      workspaceId: WORKSPACE_ID,
      catalogItemId: CATALOG_ITEM_ID,
    })

    expect(supabase.rpcCalls).toHaveLength(1)
    expect(result.data).toMatchObject({ isExisting: true, request: { id: upgradeRequest().id } })
  })

  it("rechaza una ampliaciÃ³n que ya no estÃ¡ activa", async () => {
    const inactiveError = { code: "22023", message: "STORAGE_UPGRADE_CATALOG_INACTIVE" }
    const supabase = createSupabaseMock({}, [{ data: null, error: inactiveError }])
    vi.mocked(getSupabaseClient).mockReturnValue(supabase as never)

    const { requestStorageUpgrade } = await import("@/services/storage-upgrades.service")
    const result = await requestStorageUpgrade({
      workspaceId: WORKSPACE_ID,
      catalogItemId: CATALOG_ITEM_ID,
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual(inactiveError)
    expect(supabase.rpcCalls).toHaveLength(1)
  })

  it("propaga el rechazo RLS de quien no tiene permisos de gestor", async () => {
    const rlsError = { code: "42501", message: "STORAGE_UPGRADE_NOT_ALLOWED" }
    const supabase = createSupabaseMock({}, [{ data: null, error: rlsError }])
    vi.mocked(getSupabaseClient).mockReturnValue(supabase as never)

    const { requestStorageUpgrade } = await import("@/services/storage-upgrades.service")
    const result = await requestStorageUpgrade({
      workspaceId: WORKSPACE_ID,
      catalogItemId: CATALOG_ITEM_ID,
    })

    expect(result).toEqual({ data: null, error: rlsError })
  })

  it("conserva el precio solicitado aunque el catÃ¡logo cambie despuÃ©s", async () => {
    const supabase = createSupabaseMock({
      storage_upgrade_requests: [{ data: [upgradeRequest({ monthly_price_minor: 300 })], error: null }],
    })
    vi.mocked(getSupabaseClient).mockReturnValue(supabase as never)

    const { fetchStorageUpgradeRequests } = await import("@/services/storage-upgrades.service")
    const result = await fetchStorageUpgradeRequests(WORKSPACE_ID)

    expect(result.data).toEqual([
      expect.objectContaining({ monthlyPriceMinor: 300, requestedCapacityBytes: 10_737_418_240 }),
    ])
    expect(supabase.from).not.toHaveBeenCalledWith("storage_upgrade_catalog")
  })
})
