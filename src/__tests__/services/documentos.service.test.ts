import { beforeEach, describe, expect, it, vi } from "vitest"

type QueryResponse = { data: unknown; error: unknown }

interface RecordedCall {
  table: string
  insertValues: unknown[]
  eqCalls: [string, unknown][]
  inCalls: [string, unknown[]][]
  isCalls: [string, unknown][]
  orCalls: string[]
}

function createSupabaseMock(
  responsesByTable: Record<string, QueryResponse | QueryResponse[]>,
) {
  const calls: RecordedCall[] = []
  const callIndexByTable: Record<string, number> = {}

  function makeBuilder(table: string) {
    const record: RecordedCall = {
      table,
      insertValues: [],
      eqCalls: [],
      inCalls: [],
      isCalls: [],
      orCalls: [],
    }
    calls.push(record)

    const builder: Record<string, unknown> = {
      select: vi.fn(() => builder),
      eq: vi.fn((column: string, value: unknown) => {
        record.eqCalls.push([column, value])
        return builder
      }),
      in: vi.fn((column: string, values: unknown[]) => {
        record.inCalls.push([column, values])
        return builder
      }),
      is: vi.fn((column: string, value: unknown) => {
        record.isCalls.push([column, value])
        return builder
      }),
      or: vi.fn((filter: string) => {
        record.orCalls.push(filter)
        return builder
      }),
      order: vi.fn(() => builder),
      delete: vi.fn(() => builder),
      insert: vi.fn((value: unknown) => {
        record.insertValues.push(value)
        return builder
      }),
      single: vi.fn(() => builder),
      then: (
        resolve: (value: QueryResponse) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => {
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
    calls,
  }
}

vi.mock("@/services/supabase", () => ({ getSupabaseClient: vi.fn() }))
vi.mock("@/services/content-assets.service", () => ({
  createExternalContentAsset: vi.fn(),
}))

import { createExternalContentAsset } from "@/services/content-assets.service"
import {
  createDocumentoLink,
  fetchDocumentosDisponibles,
  fetchDocumentosBySedeIds,
} from "@/services/documentos.service"
import { getSupabaseClient } from "@/services/supabase"

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111"
const ASSET_ID = "22222222-2222-4222-8222-222222222222"
const DOCUMENT_ID = "33333333-3333-4333-8333-333333333333"
const YOUTUBE_URL = "https://youtu.be/dQw4w9WgXcQ?feature=share"

const DOCUMENT_ROW = {
  id: DOCUMENT_ID,
  titulo: "Análisis de partido",
  categoria_doc: "Vídeo",
  drive_file_id: null,
  storage_path: null,
  file_name: null,
  mime_type: null,
  size_bytes: null,
  extension: "youtube",
  external_url: YOUTUBE_URL,
  source_type: "link",
  content_asset_id: ASSET_ID,
  content_assets: null,
  sede_id: null,
  workspace_id: WORKSPACE_ID,
  visible_entrenadores: false,
  created_at: "2026-08-16T10:00:00.000Z",
  updated_at: "2026-08-16T10:00:00.000Z",
}

beforeEach(() => vi.clearAllMocks())

describe("documentos.service · enlaces externos", () => {
  it("vincula un enlace YouTube al activo externo normalizado al crear el documento", async () => {
    const supabase = createSupabaseMock({
      documentos: { data: DOCUMENT_ROW, error: null },
    })
    vi.mocked(getSupabaseClient).mockReturnValue(supabase as never)
    vi.mocked(createExternalContentAsset).mockResolvedValue({
      data: { id: ASSET_ID },
      error: null,
    } as never)

    const result = await createDocumentoLink({
      titulo: "Análisis de partido",
      categoriaDoc: "Vídeo",
      externalUrl: YOUTUBE_URL,
      sedeId: null,
      sedeIds: [],
      equipoIds: [],
      workspaceId: WORKSPACE_ID,
      visibleEntrenadores: false,
      entrenadorIds: [],
    })

    expect(result.error).toBeNull()
    expect(createExternalContentAsset).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      url: YOUTUBE_URL,
    })
    expect(supabase.calls.find((call) => call.table === "documentos")?.insertValues).toEqual([
      expect.objectContaining({ content_asset_id: ASSET_ID }),
    ])
  })

  it("conserva un enlace no gestionado como external_legacy sin crear un activo", async () => {
    const externalUrl = "https://vimeo.com/123456"
    const supabase = createSupabaseMock({
      documentos: {
        data: { ...DOCUMENT_ROW, external_url: externalUrl, content_asset_id: null },
        error: null,
      },
    })
    vi.mocked(getSupabaseClient).mockReturnValue(supabase as never)

    const result = await createDocumentoLink({
      titulo: "Análisis de partido",
      categoriaDoc: "Vídeo",
      externalUrl,
      sedeId: null,
      sedeIds: [],
      equipoIds: [],
      workspaceId: WORKSPACE_ID,
      visibleEntrenadores: false,
      entrenadorIds: [],
    })

    expect(result.error).toBeNull()
    expect(createExternalContentAsset).not.toHaveBeenCalled()
    expect(supabase.calls.find((call) => call.table === "documentos")?.insertValues).toEqual([
      expect.objectContaining({
        external_url: externalUrl,
        content_asset_id: null,
      }),
    ])
  })
})

describe("documentos.service - catálogo disponible para ejercicios", () => {
  const ACTIVE_SEDE_ID = "sede-active"
  const OTHER_SEDE_ID = "sede-other"
  const OTHER_WORKSPACE_ID = "workspace-other"

  function documentoRow(
    id: string,
    overrides: { sede_id?: string | null; workspace_id?: string | null } = {},
  ) {
    return {
      ...DOCUMENT_ROW,
      id,
      updated_at: `2026-08-17T${id === "documento-global" ? "12" : "10"}:00:00.000Z`,
      ...overrides,
    }
  }

  it("devuelve solo los documentos de la sede activa y los globales exactos del workspace", async () => {
    const associatedDocument = documentoRow("documento-associated", { sede_id: ACTIVE_SEDE_ID })
    const legacyDocument = documentoRow("documento-legacy", { sede_id: ACTIVE_SEDE_ID })
    const globalDocument = documentoRow("documento-global", { sede_id: null })
    const otherSedeDocument = documentoRow("documento-other-sede", { sede_id: null })
    const otherWorkspaceDocument = documentoRow("documento-other-workspace", {
      sede_id: null,
      workspace_id: OTHER_WORKSPACE_ID,
    })
    const legacyWithoutWorkspace = documentoRow("documento-legacy-without-workspace", {
      sede_id: ACTIVE_SEDE_ID,
      workspace_id: null,
    })
    const supabase = createSupabaseMock({
      documento_sedes: [
        { data: [{ documento_id: associatedDocument.id }], error: null },
        {
          data: [
            { documento_id: associatedDocument.id, sede_id: ACTIVE_SEDE_ID },
            { documento_id: otherSedeDocument.id, sede_id: OTHER_SEDE_ID },
          ],
          error: null,
        },
      ],
      documentos: [
        { data: [{ id: legacyDocument.id }], error: null },
        { data: [associatedDocument, legacyDocument], error: null },
        { data: [globalDocument, otherSedeDocument, otherWorkspaceDocument, legacyWithoutWorkspace], error: null },
      ],
      documento_equipos: { data: [], error: null },
      documento_entrenadores: { data: [], error: null },
    })
    vi.mocked(getSupabaseClient).mockReturnValue(supabase as never)

    const result = await fetchDocumentosDisponibles([ACTIVE_SEDE_ID], WORKSPACE_ID)

    expect(result.error).toBeNull()
    expect(result.data?.map((documento) => documento.id)).toEqual([
      globalDocument.id,
      associatedDocument.id,
      legacyDocument.id,
    ])
    expect(
      supabase.calls
        .filter((call) => call.table === "documentos")
        .every((call) => call.eqCalls.some(([column, value]) => column === "workspace_id" && value === WORKSPACE_ID)),
    ).toBe(true)
    expect(
      supabase.calls.some((call) => call.orCalls.some((filter) => filter.includes("workspace_id.is.null"))),
    ).toBe(false)
  })

  it("sin sede activa devuelve solo globales exactos del workspace", async () => {
    const globalDocument = documentoRow("documento-global", { sede_id: null })
    const associatedDocument = documentoRow("documento-associated", { sede_id: null })
    const supabase = createSupabaseMock({
      documentos: { data: [globalDocument, associatedDocument], error: null },
      documento_sedes: { data: [{ documento_id: associatedDocument.id, sede_id: ACTIVE_SEDE_ID }], error: null },
      documento_equipos: { data: [], error: null },
      documento_entrenadores: { data: [], error: null },
    })
    vi.mocked(getSupabaseClient).mockReturnValue(supabase as never)

    const result = await fetchDocumentosDisponibles([], WORKSPACE_ID)

    expect(result.data?.map((documento) => documento.id)).toEqual([globalDocument.id])
    expect(supabase.calls.find((call) => call.table === "documentos")?.eqCalls).toContainEqual([
      "workspace_id",
      WORKSPACE_ID,
    ])
  })

  it("sin workspace no consulta Supabase", async () => {
    const supabase = createSupabaseMock({})
    vi.mocked(getSupabaseClient).mockReturnValue(supabase as never)

    await expect(fetchDocumentosDisponibles([ACTIVE_SEDE_ID], null)).resolves.toEqual({
      data: [],
      error: null,
    })
    expect(supabase.from).not.toHaveBeenCalled()
  })
})

describe("documentos.service · alcance por sede", () => {
  it("incluye documentos asociados y globales del workspace con su activo técnico", async () => {
    const associatedDocument = {
      ...DOCUMENT_ROW,
      id: "documento-associated",
      content_asset_id: "asset-associated",
      sede_id: "sede-active",
    }
    const globalDocument = {
      ...DOCUMENT_ROW,
      id: "documento-global",
      content_asset_id: "asset-global",
      sede_id: null,
    }
    const otherSedeDocument = {
      ...DOCUMENT_ROW,
      id: "documento-other",
      content_asset_id: "asset-other",
      sede_id: null,
    }
    const supabase = createSupabaseMock({
      documento_sedes: [
        { data: [{ documento_id: associatedDocument.id }], error: null },
        {
          data: [
            { documento_id: associatedDocument.id, sede_id: "sede-active" },
            { documento_id: otherSedeDocument.id, sede_id: "sede-other" },
          ],
          error: null,
        },
      ],
      documentos: [
        { data: [], error: null },
        { data: [associatedDocument], error: null },
        { data: [globalDocument, otherSedeDocument], error: null },
      ],
      documento_equipos: { data: [], error: null },
      documento_entrenadores: { data: [], error: null },
    })
    vi.mocked(getSupabaseClient).mockReturnValue(supabase as never)

    const result = await fetchDocumentosBySedeIds(
      ["sede-active"],
      WORKSPACE_ID,
    )

    expect(result.error).toBeNull()
    expect(result.data).toEqual([
      expect.objectContaining({
        id: associatedDocument.id,
        contentAssetId: "asset-associated",
      }),
      expect.objectContaining({
        id: globalDocument.id,
        contentAssetId: "asset-global",
      }),
    ])
  })
})
