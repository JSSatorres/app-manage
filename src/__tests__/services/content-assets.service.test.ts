import { beforeEach, describe, expect, it, vi } from "vitest"

type QueryResponse = { data: unknown; error: unknown; count?: number | null }

interface RecordedCall {
  table: string
  selectArgs: [string, { count?: string } | undefined]
  eqCalls: [string, unknown][]
  inCalls: [string, unknown][]
  rangeCalls: [number, number][]
}

function createSupabaseMock(responsesByTable: Record<string, QueryResponse | QueryResponse[]>) {
  const calls: RecordedCall[] = []
  const callIndexByTable: Record<string, number> = {}

  function makeBuilder(table: string) {
    const record: RecordedCall = {
      table,
      selectArgs: ["", undefined],
      eqCalls: [],
      inCalls: [],
      rangeCalls: [],
    }
    calls.push(record)

    const builder: Record<string, unknown> = {
      select: vi.fn((columns: string, options?: { count?: string }) => {
        record.selectArgs = [columns, options]
        return builder
      }),
      eq: vi.fn((column: string, value: unknown) => {
        record.eqCalls.push([column, value])
        return builder
      }),
      in: vi.fn((column: string, value: unknown) => {
        record.inCalls.push([column, value])
        return builder
      }),
      order: vi.fn(() => builder),
      range: vi.fn((from: number, to: number) => {
        record.rangeCalls.push([from, to])
        return builder
      }),
      then: (resolve: (value: QueryResponse) => unknown, reject?: (reason: unknown) => unknown) => {
        const configured = responsesByTable[table]
        const index = callIndexByTable[table] ?? 0
        const response = Array.isArray(configured)
          ? (configured[index] ?? configured[configured.length - 1])
          : configured ?? { data: [], error: null, count: null }
        callIndexByTable[table] = index + 1
        return Promise.resolve(response).then(resolve, reject)
      },
    }
    return builder
  }

  return { from: vi.fn((table: string) => makeBuilder(table)), calls }
}

vi.mock("@/services/supabase", () => ({ getSupabaseClient: vi.fn() }))

import { getSupabaseClient } from "@/services/supabase"

const WORKSPACE_ID = "workspace-1"
const ASSET_ROW = {
  id: "asset-1",
  workspace_id: WORKSPACE_ID,
  provider: "youtube",
  status: "ready",
  original_url: "https://www.youtube.com/watch?v=video-1",
  external_resource_id: "video-1",
  embed_url: "https://www.youtube-nocookie.com/embed/video-1",
  storage_path: null,
  size_bytes: 0,
  mime_type: null,
  checksum: null,
  created_by: "user-1",
  created_at: "2026-08-09T10:00:00.000Z",
  updated_at: "2026-08-09T10:00:00.000Z",
}

beforeEach(() => vi.clearAllMocks())

describe("content-assets.service", () => {
  it("reutiliza los IDs editoriales sin volver a consultar documentos ni pivotes", async () => {
    const { from, calls } = createSupabaseMock({
      content_assets: [
        { data: [ASSET_ROW], error: null, count: 1 },
        { data: [{ id: "asset-1" }], error: null },
      ],
    })
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never)

    const { fetchContentAssets } = await import("@/services/content-assets.service")
    const result = await fetchContentAssets(WORKSPACE_ID, {
      provider: "youtube",
      sedeId: "sede-1",
      assetIds: ["asset-1"],
    })

    expect(calls.some((call) => call.table === "documento_sedes")).toBe(false)
    expect(calls.some((call) => call.table === "documentos")).toBe(false)
    expect(calls[0]?.inCalls).toEqual([["id", ["asset-1"]]])
    expect(result.data?.assets).toHaveLength(1)
  })

  it("evita una consulta in vacía y conserva el metadato del proveedor", async () => {
    const { from, calls } = createSupabaseMock({
      content_assets: { data: [{ id: "asset-outside-scope" }], error: null },
    })
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never)

    const { fetchContentAssets } = await import("@/services/content-assets.service")
    const result = await fetchContentAssets(WORKSPACE_ID, {
      provider: "supabase_storage",
      sedeId: "sede-1",
      assetIds: [],
    })

    const assetsCalls = calls.filter((call) => call.table === "content_assets")
    expect(assetsCalls).toHaveLength(1)
    expect(assetsCalls[0]?.inCalls).toEqual([])
    expect(result).toEqual({
      data: { assets: [], hasProviderDataInWorkspace: true },
      error: null,
      count: 0,
    })
  })

  it("filtra el catálogo por workspace, proveedor y sede con paginación", async () => {
    const { from, calls } = createSupabaseMock({
      documento_sedes: { data: [{ documento_id: "documento-1" }], error: null },
      documentos: { data: [{ content_asset_id: "asset-1" }], error: null },
      content_assets: [
        { data: [ASSET_ROW], error: null, count: 7 },
        { data: [{ id: "asset-1" }], error: null },
      ],
    })
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never)

    const { fetchContentAssets } = await import("@/services/content-assets.service")
    const result = await fetchContentAssets(
      WORKSPACE_ID,
      { provider: "youtube", sedeId: "sede-1" },
      { limit: 10, offset: 20 },
    )

    const assetsCalls = calls.filter((call) => call.table === "content_assets")
    expect(calls.find((call) => call.table === "documento_sedes")?.eqCalls).toEqual([
      ["sede_id", "sede-1"],
    ])
    expect(calls.find((call) => call.table === "documentos")?.eqCalls).toEqual([
      ["workspace_id", WORKSPACE_ID],
    ])
    expect(assetsCalls[0]?.eqCalls).toEqual([
      ["workspace_id", WORKSPACE_ID],
      ["provider", "youtube"],
    ])
    expect(assetsCalls[0]?.inCalls).toEqual([["id", ["asset-1"]]])
    expect(assetsCalls[0]?.rangeCalls).toEqual([[20, 29]])
    expect(assetsCalls[0]?.selectArgs[1]).toEqual({ count: "exact" })
    expect(result).toMatchObject({
      data: {
        assets: [{ id: "asset-1", workspaceId: WORKSPACE_ID, provider: "youtube" }],
        hasProviderDataInWorkspace: true,
      },
      count: 7,
      error: null,
    })
  })

  it("calcula hasProviderDataInWorkspace sin aplicar el filtro de sede actual", async () => {
    const { from, calls } = createSupabaseMock({
      documento_sedes: { data: [], error: null },
      content_assets: {
        data: [{ id: "asset-outside-sede" }],
        error: null,
      },
    })
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never)

    const { fetchContentAssets } = await import("@/services/content-assets.service")
    const result = await fetchContentAssets(WORKSPACE_ID, {
      provider: "youtube",
      sedeId: "sede-1",
    })

    const assetsCalls = calls.filter((call) => call.table === "content_assets")
    expect(assetsCalls[0]?.eqCalls).toEqual([
      ["workspace_id", WORKSPACE_ID],
      ["provider", "youtube"],
    ])
    expect(assetsCalls[0]?.inCalls).toEqual([])
    expect(result.data?.hasProviderDataInWorkspace).toBe(true)
  })

  it("devuelve un error controlado si Supabase no está configurado", async () => {
    vi.mocked(getSupabaseClient).mockReturnValue(null)

    const { fetchContentAssets } = await import("@/services/content-assets.service")
    const result = await fetchContentAssets(WORKSPACE_ID)

    expect(result.data).toBeNull()
    expect(result.error).toBeInstanceOf(Error)
  })
})
