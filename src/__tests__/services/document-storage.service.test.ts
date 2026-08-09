import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/services/supabase", () => ({ getSupabaseClient: vi.fn() }))

import { getSupabaseClient } from "@/services/supabase"

const DOCUMENT_ID = "documento-1"
const ASSET_ID = "asset-1"
const STORAGE_PATH = "workspace-1/asset-1/object-1"

function createSupabaseMock() {
  const rpc = vi.fn()
  const upload = vi.fn()
  const remove = vi.fn()
  const createSignedUrl = vi.fn()
  const from = vi.fn(() => ({ upload, remove, createSignedUrl }))

  return {
    client: { rpc, storage: { from } },
    rpc,
    upload,
    remove,
    createSignedUrl,
  }
}

beforeEach(() => vi.clearAllMocks())

describe("document-storage.service", () => {
  it("reserva, sube al path emitido por el RPC y completa la subida", async () => {
    const mock = createSupabaseMock()
    mock.rpc
      .mockResolvedValueOnce({
        data: [{ asset_id: ASSET_ID, storage_path: STORAGE_PATH, expires_at: "2026-08-09T12:15:00.000Z" }],
        error: null,
      })
      .mockResolvedValueOnce({ data: { id: ASSET_ID, status: "ready" }, error: null })
    mock.upload.mockResolvedValue({ error: null })
    vi.mocked(getSupabaseClient).mockReturnValue(mock.client as never)

    const { uploadDocumentFile } = await import("@/services/document-storage.service")
    const result = await uploadDocumentFile({
      documentoId: DOCUMENT_ID,
      file: new File(["contenido"], "reglamento.pdf", { type: "application/pdf" }),
    })

    expect(mock.rpc).toHaveBeenNthCalledWith(1, "reserve_document_upload", {
      p_documento_id: DOCUMENT_ID,
      p_size_bytes: 9,
      p_mime_type: "application/pdf",
    })
    expect(mock.upload).toHaveBeenCalledWith(STORAGE_PATH, expect.any(File), {
      upsert: false,
      contentType: "application/pdf",
    })
    expect(mock.rpc).toHaveBeenNthCalledWith(2, "complete_document_upload", {
      p_asset_id: ASSET_ID,
    })
    expect(result).toEqual({
      data: { assetId: ASSET_ID, storagePath: STORAGE_PATH },
      error: null,
    })
  })

  it("rechaza MIME o tama\u00f1o antes de reservar", async () => {
    const mock = createSupabaseMock()
    vi.mocked(getSupabaseClient).mockReturnValue(mock.client as never)
    const { MAX_DOCUMENT_SIZE_BYTES, uploadDocumentFile } = await import("@/services/document-storage.service")

    const mimeResult = await uploadDocumentFile({
      documentoId: DOCUMENT_ID,
      file: new File(["contenido"], "ejecutable.exe", { type: "application/x-msdownload" }),
    })
    const sizeResult = await uploadDocumentFile({
      documentoId: DOCUMENT_ID,
      file: new File([new Uint8Array(MAX_DOCUMENT_SIZE_BYTES + 1)], "grande.pdf", { type: "application/pdf" }),
    })

    expect(mimeResult.error).toMatchObject({ code: "DOCUMENT_MIME_TYPE_NOT_ALLOWED" })
    expect(sizeResult.error).toMatchObject({ code: "DOCUMENT_FILE_TOO_LARGE" })
    expect(mock.rpc).not.toHaveBeenCalled()
  })

  it("devuelve un código estable cuando la cuota no permite reservar", async () => {
    const mock = createSupabaseMock()
    mock.rpc.mockResolvedValue({ data: null, error: new Error("QUOTA_EXCEEDED") })
    vi.mocked(getSupabaseClient).mockReturnValue(mock.client as never)

    const { uploadDocumentFile } = await import("@/services/document-storage.service")
    const result = await uploadDocumentFile({
      documentoId: DOCUMENT_ID,
      file: new File(["contenido"], "reglamento.pdf", { type: "application/pdf" }),
    })

    expect(result.error).toMatchObject({ code: "DOCUMENT_STORAGE_QUOTA_EXCEEDED" })
  })

  it("cancela y programa la limpieza si la subida falla", async () => {
    const mock = createSupabaseMock()
    mock.rpc
      .mockResolvedValueOnce({
        data: [{ asset_id: ASSET_ID, storage_path: STORAGE_PATH, expires_at: "2026-08-09T12:15:00.000Z" }],
        error: null,
      })
      .mockResolvedValueOnce({ data: { id: ASSET_ID, status: "failed" }, error: null })
      .mockResolvedValueOnce({ data: { id: ASSET_ID, status: "deleting" }, error: null })
      .mockResolvedValueOnce({ data: { id: ASSET_ID, status: "deleted" }, error: null })
    mock.upload.mockResolvedValue({ error: new Error("red ca\u00edda") })
    mock.remove.mockResolvedValue({ error: null })
    vi.mocked(getSupabaseClient).mockReturnValue(mock.client as never)

    const { uploadDocumentFile } = await import("@/services/document-storage.service")
    const result = await uploadDocumentFile({
      documentoId: DOCUMENT_ID,
      file: new File(["contenido"], "reglamento.pdf", { type: "application/pdf" }),
    })

    expect(result.error).toMatchObject({ code: "DOCUMENT_UPLOAD_FAILED" })
    expect(mock.rpc.mock.calls.map(([name]) => name)).toEqual([
      "reserve_document_upload",
      "cancel_document_upload",
      "mark_document_asset_deleting",
      "complete_document_asset_delete",
    ])
  })

  it("permite reintentar una eliminaci\u00f3n tras un fallo f\u00edsico sin completar dos veces", async () => {
    const mock = createSupabaseMock()
    mock.rpc
      .mockResolvedValueOnce({ data: { id: ASSET_ID, status: "deleting" }, error: null })
      .mockResolvedValueOnce({ data: { id: ASSET_ID, status: "deleting" }, error: null })
      .mockResolvedValueOnce({ data: { id: ASSET_ID, status: "deleted" }, error: null })
    mock.remove
      .mockResolvedValueOnce({ error: new Error("storage no disponible") })
      .mockResolvedValueOnce({ error: null })
    vi.mocked(getSupabaseClient).mockReturnValue(mock.client as never)

    const { deleteDocumentStorageAsset } = await import("@/services/document-storage.service")
    const first = await deleteDocumentStorageAsset({ assetId: ASSET_ID, storagePath: STORAGE_PATH })
    const retry = await deleteDocumentStorageAsset({ assetId: ASSET_ID, storagePath: STORAGE_PATH })

    expect(first.error).toMatchObject({ code: "DOCUMENT_STORAGE_DELETE_FAILED" })
    expect(retry).toEqual({ data: true, error: null })
    expect(mock.rpc.mock.calls.map(([name]) => name)).toEqual([
      "mark_document_asset_deleting",
      "mark_document_asset_deleting",
      "complete_document_asset_delete",
    ])
  })

  it("crea URLs de apertura con diez minutos de validez", async () => {
    const mock = createSupabaseMock()
    mock.createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed.example/documento" }, error: null })
    vi.mocked(getSupabaseClient).mockReturnValue(mock.client as never)

    const { getDocumentStorageOpenUrl } = await import("@/services/document-storage.service")
    const result = await getDocumentStorageOpenUrl(STORAGE_PATH)

    expect(mock.createSignedUrl).toHaveBeenCalledWith(STORAGE_PATH, 600)
    expect(result).toEqual({ data: "https://signed.example/documento", error: null })
  })
})
