import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type {
  ContentAsset,
  ExternalLegacyContentAssetRecord,
  GoogleDriveContentAssetRecord,
  SupabaseStorageContentAssetRecord,
  YouTubeContentAssetRecord,
} from "@/types/content-assets"
import type { Documento } from "@/types/documentos"
import type { WorkspaceContextValue } from "@/lib/workspaceContext"

const mocks = vi.hoisted(() => ({
  createOne: vi.fn(),
  createLink: vi.fn(),
  updateOne: vi.fn(),
  deleteOne: vi.fn(),
  useContentAssets: vi.fn(() => ({
      assets: catalogAssets,
      count: catalogCount,
      loading: catalogLoading,
      errorMessage: catalogErrorMessage,
      hasProviderDataInWorkspace: false,
      refetch: catalogRefetch,
    })),
}))

const navigationMocks = vi.hoisted(() => ({
  pathname: "/documentos",
  router: { replace: vi.fn() },
  searchParams: new URLSearchParams("fuente=youtube"),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMocks.pathname,
  useRouter: () => navigationMocks.router,
  useSearchParams: () => navigationMocks.searchParams,
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

const youtubeAsset: YouTubeContentAssetRecord = {
  id: "asset-youtube-1",
  workspaceId: "workspace-1",
  provider: "youtube",
  status: "ready",
  originalUrl: "https://youtu.be/dQw4w9WgXcQ",
  externalResourceId: "dQw4w9WgXcQ",
  embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  createdBy: "user-1",
  createdAt: "2026-08-09T10:00:00.000Z",
  updatedAt: "2026-08-09T10:00:00.000Z",
}

const googleDriveAsset: GoogleDriveContentAssetRecord = {
  id: "asset-drive-1",
  workspaceId: "workspace-1",
  provider: "google_drive",
  status: "ready",
  originalUrl: "https://drive.google.com/file/d/drive-file-1/view",
  externalResourceId: "drive-file-1",
  fileId: "drive-file-1",
  createdBy: "user-1",
  createdAt: "2026-08-09T10:00:00.000Z",
  updatedAt: "2026-08-09T10:00:00.000Z",
}

const legacyAsset: ExternalLegacyContentAssetRecord = {
  id: "asset-legacy-1",
  workspaceId: "workspace-1",
  provider: "external_legacy",
  status: "ready",
  originalUrl: "https://example.com/enlace-anterior",
  createdBy: "user-1",
  createdAt: "2026-08-09T10:00:00.000Z",
  updatedAt: "2026-08-09T10:00:00.000Z",
}

const storageDocumento: Documento = {
  id: "documento-storage-1",
  contentAssetId: storageAsset.id,
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

const documentoForAsset = (asset: ContentAsset): Documento => ({
  ...storageDocumento,
  id: `documento-${asset.id}`,
  contentAssetId: asset.id,
  titulo: `Documento ${asset.provider}`,
})

const allAssets: ContentAsset[] = [
  youtubeAsset,
  googleDriveAsset,
  storageAsset,
  legacyAsset,
]

let documentosData: Documento[] = allAssets.map(documentoForAsset)
let catalogAssets: ContentAsset[] = allAssets
let catalogCount = allAssets.length
let catalogLoading = false
let catalogErrorMessage: string | null = null
let catalogRefetch = vi.fn()
let documentosLoading = false
let documentosErrorMessage: string | null = null
let documentosRefetch = vi.fn()

let workspaceState: Pick<
  WorkspaceContextValue,
  "activeSede" | "activeWorkspaceId" | "rol" | "isEntrenador" | "setActiveSede"
> = {
  activeSede: { id: "sede-1", nombre: "Sede Norte" },
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
    data: documentosData,
    loading: documentosLoading,
    errorMessage: documentosErrorMessage,
    refetch: documentosRefetch,
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
  useContentAssets: mocks.useContentAssets,
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
type MockDocumentoAssetAssociations = {
  sedes: string[]
  equipos: string[]
  visibleEntrenadores: boolean
  esGlobal: boolean
}

function getMockAssociationsLabel(associations: MockDocumentoAssetAssociations | undefined) {
  if (!associations) return "Sin asociaciones configuradas"
  const values = [...associations.sedes, ...associations.equipos]
  if (associations.esGlobal && values.length === 0) return "Todas las sedes (global)"
  return values.length ? values.join(" · ") : "Sin asociaciones configuradas"
}

vi.mock("@/components/documentos/DocumentoProviderList", () => ({
  DocumentoProviderList: ({ assets, page, total, canWrite, associationsByAssetId, titlesByAssetId, onDelete, onEdit, onPreview, onPageChange }: {
    assets: ContentAsset[]
    page?: number
    total?: number | null
    canWrite: boolean
    associationsByAssetId?: Record<string, MockDocumentoAssetAssociations>
    titlesByAssetId?: Record<string, string>
    onDelete?: (asset: ContentAsset) => void
    onEdit?: (asset: ContentAsset) => void
    onPreview: (asset: ContentAsset) => void
    onPageChange?: (page: number) => void
  }) => (
    <section aria-label="Lista de documentos">
      <p>Página {page ?? 0} de {total ?? assets.length}</p>
      {onPageChange ? (
        <button type="button" onClick={() => onPageChange((page ?? 0) + 1)}>
          Página siguiente
        </button>
      ) : null}
      {assets.map((asset) => (
        <div key={asset.id} role="row" aria-label={`Fila de ${asset.provider}`}>
          <p>{titlesByAssetId?.[asset.id] ?? "sin título"}</p>
          <p>{getMockAssociationsLabel(associationsByAssetId?.[asset.id])}</p>
          <button type="button" onClick={() => onPreview(asset)}>Ver {asset.id}</button>
          {canWrite && asset.provider !== "external_legacy" && onEdit ? <button type="button" onClick={() => onEdit(asset)}>Editar {asset.id}</button> : null}
          {canWrite && asset.provider !== "external_legacy" && onDelete ? <button type="button" onClick={() => onDelete(asset)}>Eliminar {asset.id}</button> : null}
        </div>
      ))}
    </section>
  ),
}))
vi.mock("@/components/documentos/DocumentoPreviewDialog", () => ({
  DocumentoPreviewDialog: ({ asset, open }: { asset: ContentAsset | null; open: boolean }) =>
    open && asset ? <section role="dialog" aria-label={`Vista previa ${asset.id}`} /> : null,
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
      activeSede: { id: "sede-1", nombre: "Sede Norte" },
      activeWorkspaceId: "workspace-1",
      rol: "admin",
      isEntrenador: false,
      setActiveSede: vi.fn(),
    }
    storageLimited = false
    documentosData = allAssets.map(documentoForAsset)
    catalogAssets = allAssets
    catalogCount = allAssets.length
    catalogLoading = false
    catalogErrorMessage = null
    catalogRefetch = vi.fn()
    documentosLoading = false
    documentosErrorMessage = null
    documentosRefetch = vi.fn()
    vi.clearAllMocks()
  })

  it("muestra los cuatro orígenes en una única lista, sin pestañas ni secciones por proveedor", () => {
    render(<DocumentosListView />)

    expect(mocks.useContentAssets).toHaveBeenCalledOnce()
    expect(mocks.useContentAssets).toHaveBeenCalledWith("workspace-1", {
      sedeId: "sede-1",
      assetIds: allAssets.map((asset) => asset.id),
      pagination: { limit: 10, offset: 0 },
    })
    expect(screen.getAllByLabelText("Lista de documentos")).toHaveLength(1)
    for (const provider of ["youtube", "google_drive", "supabase_storage", "external_legacy"]) {
      expect(screen.getByRole("row", { name: `Fila de ${provider}` })).toBeInTheDocument()
    }
    expect(screen.queryByLabelText("Pestañas de documentos")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Enlaces anteriores")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Subir" })).toBeEnabled()
    expect(
      screen.queryByRole("button", { name: "Añadir vídeo de YouTube" }),
    ).not.toBeInTheDocument()
  })

  it("pagina el catálogo unificado en servidor", () => {
    render(<DocumentosListView />)

    expect(screen.getByText(`Página 0 de ${allAssets.length}`)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }))
    expect(mocks.useContentAssets).toHaveBeenLastCalledWith("workspace-1", {
      sedeId: "sede-1",
      assetIds: allAssets.map((asset) => asset.id),
      pagination: { limit: 10, offset: 10 },
    })
  })

  it("inicia los scopes nuevos en la primera página y conserva la página por scope", () => {
    const { rerender } = render(<DocumentosListView />)

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }))
    expect(mocks.useContentAssets).toHaveBeenLastCalledWith(
      "workspace-1",
      expect.objectContaining({ pagination: { limit: 10, offset: 10 } }),
    )

    workspaceState = {
      ...workspaceState,
      activeSede: { id: "sede-2", nombre: "Sede Sur" },
    }
    rerender(<DocumentosListView />)
    expect(mocks.useContentAssets).toHaveBeenLastCalledWith(
      "workspace-1",
      expect.objectContaining({
        sedeId: "sede-2",
        pagination: { limit: 10, offset: 0 },
      }),
    )

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }))
    workspaceState = { ...workspaceState, activeWorkspaceId: "workspace-2" }
    rerender(<DocumentosListView />)
    expect(mocks.useContentAssets).toHaveBeenLastCalledWith(
      "workspace-2",
      expect.objectContaining({ pagination: { limit: 10, offset: 0 } }),
    )

    workspaceState = { ...workspaceState, activeWorkspaceId: "workspace-1" }
    rerender(<DocumentosListView />)
    expect(mocks.useContentAssets).toHaveBeenLastCalledWith(
      "workspace-1",
      expect.objectContaining({ pagination: { limit: 10, offset: 10 } }),
    )
  })

  it("mantiene el catálogo completo del workspace cuando no hay sede activa", () => {
    workspaceState = { ...workspaceState, activeSede: null }

    render(<DocumentosListView />)

    expect(mocks.useContentAssets).toHaveBeenCalledOnce()
    expect(mocks.useContentAssets).toHaveBeenCalledWith("workspace-1", {
      sedeId: null,
      assetIds: undefined,
      pagination: { limit: 10, offset: 0 },
    })
    expect(screen.getByRole("button", { name: `Ver ${storageAsset.id}` })).toBeEnabled()
  })

  it("muestra el estado vacío exacto y el CTA de subida si no hay activos", () => {
    catalogAssets = []
    catalogCount = 0
    documentosData = []

    render(<DocumentosListView />)

    expect(screen.getByText("Sube documentos a tu manera")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Subir" })).toBeEnabled()
    expect(screen.queryByLabelText("Lista de documentos")).not.toBeInTheDocument()
  })

  it("muestra carga y no el estado vacío mientras un catálogo sigue pendiente", () => {
    catalogAssets = []
    catalogCount = 0
    documentosData = []
    catalogLoading = true

    render(<DocumentosListView />)

    expect(screen.getByRole("status")).toHaveTextContent("Cargando documentos")
    expect(screen.queryByText("Sube documentos a tu manera")).not.toBeInTheDocument()
  })

  it("espera la lectura editorial de una sede antes de mostrar el vacío", () => {
    catalogAssets = []
    catalogCount = 0
    documentosData = []
    documentosLoading = true

    render(<DocumentosListView />)

    expect(screen.getByRole("status")).toHaveTextContent("Cargando documentos")
    expect(screen.queryByText("Sube documentos a tu manera")).not.toBeInTheDocument()
  })

  it("muestra el error editorial de una sede y reintenta solo esa lectura", () => {
    catalogAssets = []
    catalogCount = 0
    documentosData = []
    documentosErrorMessage = "No se pudieron cargar las asociaciones"

    render(<DocumentosListView />)

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se pudieron cargar las asociaciones",
    )
    expect(screen.queryByText("Sube documentos a tu manera")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(documentosRefetch).toHaveBeenCalledOnce()
    expect(catalogRefetch).not.toHaveBeenCalled()
  })

  it("conserva las filas previas si falla la lectura editorial de la sede", () => {
    documentosErrorMessage = "No se pudieron actualizar las asociaciones"

    render(<DocumentosListView />)

    expect(screen.getByLabelText("Lista de documentos")).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se pudieron actualizar las asociaciones",
    )
  })

  it("no bloquea el catálogo del workspace por la consulta editorial vacía sin sede", () => {
    workspaceState = { ...workspaceState, activeSede: null }
    catalogAssets = []
    catalogCount = 0
    documentosData = []
    documentosLoading = true
    documentosErrorMessage = "Consulta editorial omitida"

    render(<DocumentosListView />)

    expect(screen.getByText("Sube documentos a tu manera")).toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("muestra el error sin falso vacío y reintenta el catálogo unificado", () => {
    catalogAssets = []
    catalogCount = 0
    documentosData = []
    catalogErrorMessage = "No se pudieron cargar los documentos"

    render(<DocumentosListView />)

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar los documentos")
    expect(screen.queryByText("Sube documentos a tu manera")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(catalogRefetch).toHaveBeenCalledOnce()
  })

  it("conserva la lista y muestra reintento ante un error parcial", () => {
    catalogErrorMessage = "No se pudo actualizar una parte del catálogo"

    render(<DocumentosListView />)

    expect(screen.getByLabelText("Lista de documentos")).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se pudo actualizar una parte del catálogo",
    )
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(catalogRefetch).toHaveBeenCalledOnce()
  })

  it("mantiene abrir y eliminar documentos privados al limitarse la cuota para un gestor", () => {
    storageLimited = true
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    mocks.deleteOne.mockResolvedValue(true)

    render(<DocumentosListView />)

    expect(screen.getByRole("button", { name: "Subir" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Subir archivo" })).toBeDisabled()
    expect(screen.getByRole("button", { name: `Ver ${storageAsset.id}` })).toBeEnabled()
    fireEvent.click(screen.getByRole("button", { name: `Eliminar ${storageAsset.id}` }))

    expect(confirmSpy).toHaveBeenCalled()
    expect(mocks.deleteOne).toHaveBeenCalledWith(`documento-${storageAsset.id}`)
  })

  it("mantiene la previsualización y bloquea editar o eliminar enlaces legacy", () => {
    render(<DocumentosListView />)

    fireEvent.click(screen.getByRole("button", { name: `Ver ${legacyAsset.id}` }))
    expect(
      screen.getByRole("dialog", { name: `Vista previa ${legacyAsset.id}` }),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: `Editar ${legacyAsset.id}` })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: `Eliminar ${legacyAsset.id}` })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: `Editar ${storageAsset.id}` })).toBeEnabled()
    expect(screen.getByRole("button", { name: `Eliminar ${storageAsset.id}` })).toBeEnabled()
  })

  it("conserva el control de Storage y abre su formulario directamente", () => {
    render(<DocumentosListView />)

    fireEvent.click(screen.getByRole("button", { name: "Subir archivo" }))

    expect(
      screen.getByRole("dialog", { name: "Formulario supabase_storage" }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("dialog", { name: "¿Cómo quieres subir el documento?" }),
    ).not.toBeInTheDocument()
  })

  it("ofrece editar y eliminar solo a gestores, y conserva abrir para entrenadores", () => {
    const { rerender } = render(<DocumentosListView />)

    fireEvent.click(screen.getByRole("button", { name: `Editar ${storageAsset.id}` }))
    expect(screen.getByText("Editando Documento supabase_storage")).toBeInTheDocument()

    workspaceState = { ...workspaceState, rol: "entrenador", isEntrenador: true }
    rerender(<DocumentosListView />)

    expect(screen.getByRole("button", { name: `Ver ${storageAsset.id}` })).toBeEnabled()
    expect(screen.queryByRole("button", { name: `Editar ${storageAsset.id}` })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: `Eliminar ${storageAsset.id}` })).not.toBeInTheDocument()
  })

  it("deduplica activos repetidos entre catálogos", () => {
    catalogAssets = [youtubeAsset, googleDriveAsset, youtubeAsset, storageAsset, legacyAsset]
    catalogCount = catalogAssets.length

    render(<DocumentosListView />)

    expect(screen.getAllByRole("row")).toHaveLength(4)
  })

  it("identifica un documento sin sedes como global en la lista", async () => {
    documentosData = [{ ...documentoForAsset(storageAsset), sedeId: null, sedeIds: [] }]
    catalogAssets = [storageAsset]
    catalogCount = 1

    render(<DocumentosListView />)

    expect(await screen.findByText(/Todas las sedes \(global\)/i)).toBeInTheDocument()
    expect(screen.queryByText(/Sin asociaciones configuradas/i)).not.toBeInTheDocument()
  })

  it("conserva el nombre de la sede para un documento con sedes concretas", async () => {
    documentosData = [documentoForAsset(storageAsset)]
    catalogAssets = [storageAsset]
    catalogCount = 1

    render(<DocumentosListView />)

    expect(await screen.findByText("sede-1")).toBeInTheDocument()
    expect(screen.queryByText(/Todas las sedes \(global\)/i)).not.toBeInTheDocument()
  })

  it("muestra el título del documento asociado en la columna de contenido", () => {
    catalogAssets = [storageAsset, legacyAsset]
    catalogCount = catalogAssets.length
    documentosData = [documentoForAsset(storageAsset)]

    render(<DocumentosListView />)

    expect(screen.getByText("Documento supabase_storage")).toBeInTheDocument()
    expect(screen.getByText("sin título")).toBeInTheDocument()
  })

  it("abre el selector de método desde una lista con documentos", () => {
    render(<DocumentosListView />)

    fireEvent.click(screen.getByRole("button", { name: "Subir" }))
    expect(
      screen.getByRole("dialog", { name: "¿Cómo quieres subir el documento?" }),
    ).toBeInTheDocument()
  })

  it("abre el selector de método desde el estado vacío", () => {
    catalogAssets = []
    catalogCount = 0
    documentosData = []

    render(<DocumentosListView />)

    fireEvent.click(screen.getByRole("button", { name: "Subir" }))
    expect(
      screen.getByRole("dialog", { name: "¿Cómo quieres subir el documento?" }),
    ).toBeInTheDocument()
  })

  it.each([
    ["YouTube", "youtube"],
    ["Google Drive", "google_drive"],
    ["Almacenamiento", "supabase_storage"],
  ] as const)("abre el formulario de %s al elegirlo", (label, provider) => {
    render(<DocumentosListView />)

    fireEvent.click(screen.getByRole("button", { name: "Subir" }))
    fireEvent.click(screen.getByRole("button", { name: label }))

    expect(
      screen.getByRole("dialog", { name: `Formulario ${provider}` }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("dialog", { name: "¿Cómo quieres subir el documento?" }),
    ).not.toBeInTheDocument()
  })
})
