import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { DocumentoProviderList } from "@/components/documentos/DocumentoProviderList"
import type { ContentAsset } from "@/types/content-assets"

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

describe("DocumentoProviderList", () => {
  it("muestra metadatos, badges, asociaciones y visibilidad del activo", () => {
    render(
      <DocumentoProviderList
        provider="youtube"
        assets={[youtubeAsset]}
        page={0}
        total={1}
        onPageChange={vi.fn()}
        associationsByAssetId={{
          "asset-youtube": {
            sedes: ["Sede Central"],
            equipos: ["Cadete A"],
            visibleEntrenadores: true,
          },
        }}
        onPreview={vi.fn()}
      />,
    )

    expect(screen.getByText("YouTube")).toBeInTheDocument()
    expect(screen.getByText("Listo")).toBeInTheDocument()
    expect(screen.getByText("Sede Central · Cadete A")).toBeInTheDocument()
    expect(screen.getByText("Visible para entrenadores")).toBeInTheDocument()
    expect(screen.getByText("Almacenado en YouTube · no consume espacio de tu plan.")).toBeInTheDocument()
  })

  it("delega la paginación en el catálogo y no muestra acciones de gestión a solo lectura", () => {
    const onPageChange = vi.fn()
    const onPreview = vi.fn()
    render(
      <DocumentoProviderList
        provider="youtube"
        assets={[youtubeAsset]}
        page={0}
        total={11}
        onPageChange={onPageChange}
        onPreview={onPreview}
        canWrite={false}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }))
    fireEvent.click(screen.getByRole("button", { name: "Ver Vídeo de YouTube" }))

    expect(onPageChange).toHaveBeenCalledWith(1)
    expect(onPreview).toHaveBeenCalledWith(youtubeAsset)
    expect(screen.queryByRole("button", { name: "Editar Vídeo de YouTube" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Eliminar Vídeo de YouTube" })).not.toBeInTheDocument()
  })

  it("mantiene abrir disponible y bloquea acciones de gestión durante una eliminación", () => {
    render(
      <DocumentoProviderList
        provider="youtube"
        assets={[youtubeAsset]}
        page={0}
        total={1}
        onPageChange={vi.fn()}
        onPreview={vi.fn()}
        canWrite
        actionLoading
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByRole("button", { name: "Ver Vídeo de YouTube" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Editar Vídeo de YouTube" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Eliminar Vídeo de YouTube" })).toBeDisabled()
  })
})
