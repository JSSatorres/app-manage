import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { ContentAsset, SupabaseStorageContentAssetRecord } from "@/types/content-assets"
import type { Documento } from "@/types/documentos"

const mocks = vi.hoisted(() => ({
  createOne: vi.fn(),
  createLink: vi.fn(),
  updateOne: vi.fn(),
  deleteOne: vi.fn(),
}))

const storageAsset: SupabaseStorageContentAssetRecord = {
  id: "asset-storage-1",
  workspaceId: "workspace-1",
  provider: "supabase_storage",
  status: "ready",
  originalUrl: null,
  storagePath: "workspace-1/fixture-privado.pdf",
  sizeBytes: 1024,
  mimeType: "application/pdf",
  createdBy: "user-1",
  createdAt: "2026-08-09T10:00:00.000Z",
  updatedAt: "2026-08-09T10:00:00.000Z",
}

const storageDocumento: Documento = {
  id: "documento-storage-1",
  titulo: "Documento privado",
  categoriaDoc: null,
  driveFileId: null,
  storagePath: storageAsset.storagePath,
  fileName: "fixture-privado.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1024,
  extension: "pdf",
  sourceType: "file",
  externalUrl: null,
  sedeId: "sede-1",
  sedeIds: ["sede-1"],
  equipoIds: [],
  workspaceId: "workspace-1",
  visibleEntrenadores: false,
  entrenadorIds: [],
  createdAt: "2026-08-09T10:00:00.000Z",
  updatedAt: "2026-08-09T10:00:00.000Z",
}

let workspaceState = {
  activeSede: { id: "sede-1" },
  activeWorkspaceId: "workspace-1",
  rol: "admin",
  isEntrenador: false,
  setActiveSede: vi.fn(),
}
let storageLimited = false

vi.mock("@/lib/workspaceContext", () => ({
  useWorkspaceContext: () => workspaceState,
}))
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }))
vi.mock("@/hooks/useDocumentos", () => ({
  useDocumentos: () => ({
    data: [storageDocumento],
    createOne: mocks.createOne,
    createLink: mocks.createLink,
    updateOne: mocks.updateOne,
    deleteOne: mocks.deleteOne,
    createLoading: false,
    createLinkLoading: false,
    updateLoading: false,
    deleteLoading: false,
    createErrorMessage: null,
    createLinkErrorMessage: null,
    updateErrorMessage: null,
    deleteErrorMessage: null,
  }),
}))
vi.mock("@/hooks/useSedesLookup", () => ({ useSedesLookup: () => ({ data: [] }) }))
vi.mock("@/hooks/useEquiposLookup", () => ({ useEquiposLookup: () => ({ data: [] }) }))
vi.mock("@/hooks/useContentAssets", () => ({
  useContentAssets: (_workspaceId: string, options: { provider?: string }) => ({
    assets: options.provider === "supabase_storage" ? [storageAsset] : [],
    count: 0,
    loading: false,
    errorMessage: null,
    hasProviderDataInWorkspace: false,
    refetch: vi.fn(),
  }),
}))
vi.mock("@/components/documentos/DocumentosProviderTabs", () => ({
  DocumentosProviderTabs: ({ onCreate, initialProvider, providers }: {
    onCreate: (provider: "youtube" | "google_drive" | "supabase_storage") => void
    initialProvider?: string
    providers: { supabase_storage: { children?: React.ReactNode } }
  }) => (
    <section aria-label="Pestañas de documentos">
      <p>Pestaña seleccionada {initialProvider}</p>
      <button type="button" onClick={() => onCreate("youtube")}>Añadir vídeo de YouTube</button>
      <button type="button" onClick={() => onCreate("google_drive")}>Añadir enlace de Google Drive</button>
       <button type="button" onClick={() => onCreate("supabase_storage")}>Subir archivo</button>
       {providers.supabase_storage.children}
    </section>
  ),
}))
vi.mock("@/components/documentos/DocumentoForm", () => ({
  DocumentoForm: ({ open, sourceProvider, initialValue, onOpenChange }: {
    open: boolean
    sourceProvider?: string
    initialValue?: Documento | null
    onOpenChange: (open: boolean) => void
  }) => open ? (
    <section role="dialog" aria-label={`Formulario ${sourceProvider}`}>
      {initialValue ? <p>Editando {initialValue.titulo}</p> : null}
      <button type="button" onClick={() => onOpenChange(false)}>Cerrar formulario</button>
    </section>
  ) : null,
}))
vi.mock("@/components/documentos/DocumentoProviderList", () => ({
  DocumentoProviderList: ({ assets, canWrite, onDelete, onEdit, onPreview }: {
    assets: ContentAsset[]
    canWrite: boolean
    onDelete?: (asset: ContentAsset) => void
    onEdit?: (asset: ContentAsset) => void
    onPreview: (asset: ContentAsset) => void
  }) => assets.map((asset) => (
    <div key={asset.id}>
      <button type="button" onClick={() => onPreview(asset)}>Ver fixture-privado.pdf</button>
      {canWrite && onEdit ? <button type="button" onClick={() => onEdit(asset)}>Editar fixture-privado.pdf</button> : null}
      {canWrite && onDelete ? <button type="button" onClick={() => onDelete(asset)}>Eliminar fixture-privado.pdf</button> : null}
    </div>
  )),
}))
vi.mock("@/components/documentos/DocumentoPreviewDialog", () => ({
  DocumentoPreviewDialog: () => null,
}))
vi.mock("@/components/documentos/StorageUsageCard", () => ({
  StorageUsageCard: ({ onUpload }: { onUpload?: () => void }) => (
    <button type="button" onClick={onUpload} disabled={storageLimited}>Subir archivo</button>
  ),
}))

import { DocumentosListView } from "@/components/documentos/DocumentosListView"

describe("DocumentosListView", () => {
  afterEach(() => {
    workspaceState = {
      activeSede: { id: "sede-1" },
      activeWorkspaceId: "workspace-1",
      rol: "admin",
      isEntrenador: false,
      setActiveSede: vi.fn(),
    }
    storageLimited = false
    vi.clearAllMocks()
  })

  it("abre el flujo de alta propio de cada CTA y conserva su pestaña al cerrar", () => {
    render(<DocumentosListView />)

    fireEvent.click(screen.getByRole("button", { name: "Añadir vídeo de YouTube" }))
    expect(screen.getByRole("dialog", { name: "Formulario youtube" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Cerrar formulario" }))

    fireEvent.click(screen.getByRole("button", { name: "Añadir enlace de Google Drive" }))
    expect(screen.getByRole("dialog", { name: "Formulario google_drive" })).toBeInTheDocument()
    expect(screen.getByText("Pestaña seleccionada google_drive")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Cerrar formulario" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.getByText("Pestaña seleccionada google_drive")).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole("button", { name: "Subir archivo" })[0])
    expect(screen.getByRole("dialog", { name: "Formulario supabase_storage" })).toBeInTheDocument()
  })

  it("mantiene abrir y eliminar documentos privados al limitarse la cuota para un gestor", () => {
    storageLimited = true
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    mocks.deleteOne.mockResolvedValue(true)

    render(<DocumentosListView />)

    expect(screen.getAllByRole("button", { name: "Subir archivo" }).at(-1)).toBeDisabled()
    expect(screen.getByRole("button", { name: "Ver fixture-privado.pdf" })).toBeEnabled()
    fireEvent.click(screen.getByRole("button", { name: "Eliminar fixture-privado.pdf" }))

    expect(confirmSpy).toHaveBeenCalled()
    expect(mocks.deleteOne).toHaveBeenCalledWith(storageDocumento.id)
  })

  it("ofrece editar y eliminar solo a gestores, y conserva abrir para entrenadores", () => {
    const { rerender } = render(<DocumentosListView />)

    fireEvent.click(screen.getByRole("button", { name: "Editar fixture-privado.pdf" }))
    expect(screen.getByText("Editando Documento privado")).toBeInTheDocument()

    workspaceState = { ...workspaceState, rol: "entrenador", isEntrenador: true }
    rerender(<DocumentosListView />)

    expect(screen.getByRole("button", { name: "Ver fixture-privado.pdf" })).toBeEnabled()
    expect(screen.queryByRole("button", { name: "Editar fixture-privado.pdf" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Eliminar fixture-privado.pdf" })).not.toBeInTheDocument()
  })
})
