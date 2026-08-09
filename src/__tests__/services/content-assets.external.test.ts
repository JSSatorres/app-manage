import { beforeEach, describe, expect, it, vi } from "vitest"

type QueryResponse = { data: unknown; error: unknown }

interface RecordedCall {
  table: string
  eqCalls: [string, unknown][]
  insertValues: unknown[]
  updateValues: unknown[]
}

function createSupabaseMock(responsesByTable: Record<string, QueryResponse | QueryResponse[]>) {
  const calls: RecordedCall[] = []
  const callIndexByTable: Record<string, number> = {}

  function makeBuilder(table: string) {
    const record: RecordedCall = { table, eqCalls: [], insertValues: [], updateValues: [] }
    calls.push(record)

    const builder: Record<string, unknown> = {
      select: vi.fn(() => builder),
      eq: vi.fn((column: string, value: unknown) => {
        record.eqCalls.push([column, value])
        return builder
      }),
      in: vi.fn(() => builder),
      insert: vi.fn((value: unknown) => {
        record.insertValues.push(value)
        return builder
      }),
      update: vi.fn((value: unknown) => {
        record.updateValues.push(value)
        return builder
      }),
      maybeSingle: vi.fn(() => builder),
      single: vi.fn(() => builder),
      then: (resolve: (value: QueryResponse) => unknown, reject?: (reason: unknown) => unknown) => {
        const configured = responsesByTable[table]
        const index = callIndexByTable[table] ?? 0
        const response = Array.isArray(configured)
          ? (configured[index] ?? configured[configured.length - 1])
          : configured ?? { data: null, error: null }
        callIndexByTable[table] = index + 1
        return Promise.resolve(response).then(resolve, reject)
      },
    }
    return builder
  }

  return {
    from: vi.fn((table: string) => makeBuilder(table)),
    auth: { getUser: vi.fn() },
    calls,
  }
}

vi.mock("@/services/supabase", () => ({ getSupabaseClient: vi.fn() }))

import { getSupabaseClient } from "@/services/supabase"

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111"
const USER_ID = "22222222-2222-4222-8222-222222222222"
const ASSET_ID = "33333333-3333-4333-8333-333333333333"
const YOUTUBE_ROW = {
  id: ASSET_ID,
  workspace_id: WORKSPACE_ID,
  provider: "youtube",
  status: "pending_validation",
  original_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  external_resource_id: "dQw4w9WgXcQ",
  embed_url: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  storage_path: null,
  size_bytes: 0,
  mime_type: null,
  checksum: null,
  created_by: USER_ID,
  created_at: "2026-08-09T10:00:00.000Z",
  updated_at: "2026-08-09T10:00:00.000Z",
}

beforeEach(() => vi.clearAllMocks())

describe("content-assets.service · enlaces externos", () => {
  it("crea un activo YouTube pendiente con solo URL e ID normalizados", async () => {
    const supabase = createSupabaseMock({
      content_assets: [
        { data: null, error: null },
        { data: YOUTUBE_ROW, error: null },
      ],
    })
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    vi.mocked(getSupabaseClient).mockReturnValue(supabase as never)

    const { createExternalContentAsset } = await import("@/services/content-assets.service")
    const result = await createExternalContentAsset({
      workspaceId: WORKSPACE_ID,
      url: "https://youtu.be/dQw4w9WgXcQ?feature=share",
    })

    expect(result).toMatchObject({
      data: {
        id: ASSET_ID,
        provider: "youtube",
        status: "pending_validation",
        originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        externalResourceId: "dQw4w9WgXcQ",
      },
      error: null,
    })
    expect(supabase.calls[1]?.insertValues).toEqual([
      {
        workspace_id: WORKSPACE_ID,
        provider: "youtube",
        status: "pending_validation",
        original_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        external_resource_id: "dQw4w9WgXcQ",
        embed_url: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
        created_by: USER_ID,
      },
    ])
  })

  it("reutiliza el activo existente para el mismo recurso normalizado del workspace", async () => {
    const supabase = createSupabaseMock({ content_assets: { data: YOUTUBE_ROW, error: null } })
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    vi.mocked(getSupabaseClient).mockReturnValue(supabase as never)

    const { createExternalContentAsset } = await import("@/services/content-assets.service")
    const result = await createExternalContentAsset({
      workspaceId: WORKSPACE_ID,
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    })

    expect(result.data?.id).toBe(ASSET_ID)
    expect(supabase.calls).toHaveLength(1)
    expect(supabase.calls[0]?.insertValues).toEqual([])
  })

  it.each([
    "https://vimeo.com/123456",
    "https://www.youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    '<iframe src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></iframe>',
  ])("rechaza altas de proveedor no permitido, host no permitido o HTML: %s", async (url) => {
    const supabase = createSupabaseMock({})
    vi.mocked(getSupabaseClient).mockReturnValue(supabase as never)

    const { createExternalContentAsset } = await import("@/services/content-assets.service")
    const result = await createExternalContentAsset({ workspaceId: WORKSPACE_ID, url })

    expect(result.data).toBeNull()
    expect(result.error).toBeInstanceOf(Error)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it.each([
    [{ hasAccess: false, embedAvailable: true }, "unavailable"],
    [{ hasAccess: true, embedAvailable: false }, "unavailable"],
    [{ hasAccess: true, embedAvailable: true, providerAccepted: false }, "rejected"],
    [{ hasAccess: true, embedAvailable: true }, "ready"],
  ] as const)("conserva el activo y marca %s tras la validación", async (validation, status) => {
    const supabase = createSupabaseMock({
      content_assets: { data: { ...YOUTUBE_ROW, status }, error: null },
    })
    vi.mocked(getSupabaseClient).mockReturnValue(supabase as never)

    const { validateExternalContentAsset } = await import("@/services/content-assets.service")
    const result = await validateExternalContentAsset(ASSET_ID, validation)

    expect(result.data?.status).toBe(status)
    expect(supabase.calls[0]?.updateValues).toEqual([{ status }])
    expect(supabase.calls[0]?.eqCalls).toEqual([
      ["id", ASSET_ID],
      ["status", "pending_validation"],
    ])
  })
})
