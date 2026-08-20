import { beforeEach, describe, expect, it, vi } from "vitest"

type QueryResponse = { data: unknown; error: unknown }

function createBuilder(response: QueryResponse) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    in: vi.fn(() => builder),
    then: (
      resolve: (value: QueryResponse) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(response).then(resolve, reject),
  }
  return builder
}

vi.mock("@/services/supabase", () => ({ getSupabaseClient: vi.fn() }))

import { fetchDocumentosBySesion } from "@/services/sesion-documentos.service"
import { getSupabaseClient } from "@/services/supabase"

beforeEach(() => vi.clearAllMocks())

describe("sesion-documentos.service", () => {
  it("expone el activo técnico del documento adjunto", async () => {
    const pivotBuilder = createBuilder({
      data: [{ documento_id: "documento-1", created_at: "2026-08-16" }],
      error: null,
    })
    const documentBuilder = createBuilder({
      data: [
        {
          id: "documento-1",
          content_asset_id: "asset-1",
          titulo: "Plan de sesión",
          categoria_doc: null,
          drive_file_id: null,
          storage_path: "workspace/plan.pdf",
          file_name: "plan.pdf",
          mime_type: "application/pdf",
          size_bytes: 256,
          extension: "pdf",
          external_url: null,
          source_type: "file",
          sede_id: "sede-1",
          created_at: "2026-08-16",
          updated_at: "2026-08-16",
        },
      ],
      error: null,
    })
    const from = vi.fn((table: string) =>
      table === "sesion_documentos" ? pivotBuilder : documentBuilder,
    )
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never)

    const result = await fetchDocumentosBySesion("sesion-1")

    expect(result.data).toEqual([
      expect.objectContaining({
        id: "documento-1",
        contentAssetId: "asset-1",
      }),
    ])
    expect(documentBuilder.select).toHaveBeenCalledWith(
      expect.stringContaining("content_asset_id"),
    )
  })
})
