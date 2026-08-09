import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DocumentoPreviewDialog } from "@/components/documentos/DocumentoPreviewDialog"
import type { ContentAsset } from "@/types/content-assets"

const storageMocks = vi.hoisted(() => ({ getDocumentStorageOpenUrl: vi.fn() }))

vi.mock("@/services/document-storage.service", () => storageMocks)

const youtubeAsset: ContentAsset = {
  id: "asset-youtube",
  workspaceId: "workspace-1",
  provider: "youtube",
  status: "ready",
  originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  externalResourceId: "dQw4w9WgXcQ",
  embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  createdBy: "user-1",
  createdAt: "2026-08-09T10:00:00.000Z",
  updatedAt: "2026-08-09T10:00:00.000Z",
}

const storageAsset: ContentAsset = {
  id: "asset-storage",
  workspaceId: "workspace-1",
  provider: "supabase_storage",
  status: "ready",
  originalUrl: null,
  storagePath: "workspace-1/asset-storage/archivo.pdf",
  sizeBytes: 2048,
  mimeType: "application/pdf",
  createdBy: "user-1",
  createdAt: "2026-08-09T10:00:00.000Z",
  updatedAt: "2026-08-09T10:00:00.000Z",
}

describe("DocumentoPreviewDialog", () => {
  beforeEach(() => vi.clearAllMocks())

  it("inserta un iframe de YouTube restringido y mantiene un fallback seguro", () => {
    render(<DocumentoPreviewDialog asset={youtubeAsset} open onOpenChange={vi.fn()} />)

    const iframe = screen.getByTitle("Previsualización de Vídeo de YouTube")
    expect(iframe).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")
    expect(iframe).toHaveAttribute("loading", "lazy")
    expect(iframe).toHaveAttribute("referrerpolicy", "strict-origin-when-cross-origin")
    expect(iframe).toHaveAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation")
    expect(iframe).toHaveAttribute("allow", "encrypted-media; picture-in-picture")
    expect(screen.getByRole("button", { name: "Abrir en YouTube" })).toBeInTheDocument()
  })

  it("solicita la URL firmada de Supabase solo al abrir y no la conserva al cerrar", async () => {
    storageMocks.getDocumentStorageOpenUrl.mockResolvedValue({
      data: "https://signed.example/documento.pdf",
      error: null,
    })
    const onOpenChange = vi.fn()
    const { rerender } = render(
      <DocumentoPreviewDialog asset={storageAsset} open onOpenChange={onOpenChange} />,
    )

    await waitFor(() => expect(storageMocks.getDocumentStorageOpenUrl).toHaveBeenCalledWith(storageAsset.storagePath))
    expect(screen.getByRole("button", { name: "Abrir archivo" })).toHaveAttribute(
      "href",
      "https://signed.example/documento.pdf",
    )

    rerender(<DocumentoPreviewDialog asset={storageAsset} open={false} onOpenChange={onOpenChange} />)
    rerender(<DocumentoPreviewDialog asset={storageAsset} open onOpenChange={onOpenChange} />)

    await waitFor(() => expect(storageMocks.getDocumentStorageOpenUrl).toHaveBeenCalledTimes(2))
  })

  it("explica un enlace Drive sin acceso sin intentar sortear su ACL", () => {
    const driveAsset: ContentAsset = {
      id: "asset-drive",
      workspaceId: "workspace-1",
      provider: "google_drive",
      status: "unavailable",
      originalUrl: "https://drive.google.com/file/d/abcdefghijkl/view",
      externalResourceId: "abcdefghijkl",
      fileId: "abcdefghijkl",
      createdBy: "user-1",
      createdAt: "2026-08-09T10:00:00.000Z",
      updatedAt: "2026-08-09T10:00:00.000Z",
    }
    render(<DocumentoPreviewDialog asset={driveAsset} open onOpenChange={vi.fn()} />)

    expect(screen.getByRole("alert")).toHaveTextContent("permisos de Google Drive")
    expect(screen.getByRole("button", { name: "Abrir en Google Drive" })).toBeInTheDocument()
  })
})
