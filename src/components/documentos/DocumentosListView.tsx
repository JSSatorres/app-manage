"use client"

import { useMemo, useState } from "react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DocumentoPreviewDialog } from "./DocumentoPreviewDialog"
import { DocumentoForm, type DocumentoFormSubmit } from "./DocumentoForm"
import { DocumentoProviderList } from "./DocumentoProviderList"
import type { DocumentoProvider } from "./DocumentoProviderEmptyState"
import { DocumentoProviderGuide } from "./DocumentoProviderGuide"
import { StorageUsageCard } from "./StorageUsageCard"
import {
  DocumentosProviderTabs,
  type DocumentoProviderTab,
} from "./DocumentosProviderTabs"
import { useContentAssets } from "@/hooks/useContentAssets"
import { useDocumentos } from "@/hooks/useDocumentos"
import { useAuth } from "@/hooks/useAuth"
import { useEquiposLookup } from "@/hooks/useEquiposLookup"
import { useSedesLookup } from "@/hooks/useSedesLookup"
import { can } from "@/lib/permisos"
import { useWorkspaceContext } from "@/lib/workspaceContext"
import type { ContentAsset } from "@/types/content-assets"
import type { Documento } from "@/types/documentos"

const PAGE_SIZE = 10

const providerTitles: Record<DocumentoProvider, string> = {
  youtube: "Añadir vídeo de YouTube",
  google_drive: "Añadir enlace de Google Drive",
  supabase_storage: "Subir archivo",
}

export function DocumentosListView() {
  const { activeSede, activeWorkspaceId, rol, isEntrenador, setActiveSede } =
    useWorkspaceContext()
  const { user } = useAuth()
  const puedeMutar = can(rol, "documentos", "mutate")
  const [pages, setPages] = useState({
    youtube: 0,
    google_drive: 0,
    supabase_storage: 0,
    external_legacy: 0,
  })
  const [previewAsset, setPreviewAsset] = useState<ContentAsset | null>(null)
  const [formProvider, setFormProvider] = useState<DocumentoProvider | null>(null)
  const [editingDocumento, setEditingDocumento] = useState<Documento | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const sedeId = activeSede?.id ?? null
  const sedeIds = activeSede ? [activeSede.id] : []
  const documentos = useDocumentos(
    sedeIds,
    activeWorkspaceId,
    isEntrenador ? (user?.id ?? null) : null,
  )
  const sedesLookup = useSedesLookup()
  const equiposLookup = useEquiposLookup(sedeIds)
  const youtube = useContentAssets(activeWorkspaceId, {
    provider: "youtube",
    sedeId,
    pagination: { limit: PAGE_SIZE, offset: pages.youtube * PAGE_SIZE },
  })
  const googleDrive = useContentAssets(activeWorkspaceId, {
    provider: "google_drive",
    sedeId,
    pagination: { limit: PAGE_SIZE, offset: pages.google_drive * PAGE_SIZE },
  })
  const storage = useContentAssets(activeWorkspaceId, {
    provider: "supabase_storage",
    sedeId,
    pagination: {
      limit: PAGE_SIZE,
      offset: pages.supabase_storage * PAGE_SIZE,
    },
  })
  const legacy = useContentAssets(activeWorkspaceId, {
    provider: "external_legacy",
    sedeId,
    pagination: { limit: PAGE_SIZE, offset: pages.external_legacy * PAGE_SIZE },
  })

  const associationsByAssetId = useMemo(() => {
    const sedeNameById = new Map(
      (sedesLookup.data ?? []).map((sede) => [sede.id, sede.nombre]),
    )
    const equipoNameById = new Map(
      (equiposLookup.data ?? []).map((equipo) => [equipo.id, equipo.nombre]),
    )
    const documentsByAsset = new Map<string, Documento>()

    for (const document of documentos.data ?? []) {
      if (document.storagePath) documentsByAsset.set(document.storagePath, document)
      if (document.externalUrl) documentsByAsset.set(document.externalUrl, document)
    }

    const result: Record<
      string,
      { sedes: string[]; equipos: string[]; visibleEntrenadores: boolean }
    > = {}
    for (const asset of [
      ...youtube.assets,
      ...googleDrive.assets,
      ...storage.assets,
      ...legacy.assets,
    ]) {
      const document = documentsByAsset.get(
        asset.provider === "supabase_storage"
          ? asset.storagePath
          : asset.originalUrl ?? "",
      )
      if (!document) continue
      const documentSedeIds =
        document.sedeIds.length > 0
          ? document.sedeIds
          : document.sedeId
            ? [document.sedeId]
            : []
      result[asset.id] = {
        sedes: documentSedeIds.map((id) => sedeNameById.get(id) ?? id),
        equipos: document.equipoIds.map((id) => equipoNameById.get(id) ?? id),
        visibleEntrenadores: document.visibleEntrenadores,
      }
    }
    return result
  }, [documentos.data, equiposLookup.data, googleDrive.assets, legacy.assets, sedesLookup.data, storage.assets, youtube.assets])

  const documentsByAsset = useMemo(() => {
    const result = new Map<string, Documento>()
    for (const document of documentos.data ?? []) {
      if (document.storagePath) result.set(document.storagePath, document)
      if (document.externalUrl) result.set(document.externalUrl, document)
    }
    return result
  }, [documentos.data])

  const puedeGestionarDocumentos = puedeMutar && !isEntrenador

  function getDocumentoForAsset(asset: ContentAsset) {
    return documentsByAsset.get(
      asset.provider === "supabase_storage"
        ? asset.storagePath
        : asset.originalUrl ?? "",
    )
  }

  function handleCreate(provider: DocumentoProvider) {
    setEditingDocumento(null)
    setFormProvider(provider)
    setFormOpen(true)
  }

  async function handleFormSubmit(value: DocumentoFormSubmit) {
    if (editingDocumento) {
      const result = await documentos.updateOne(editingDocumento.id, {
        titulo: value.titulo,
        categoriaDoc: value.categoriaDoc || null,
        sedeId: value.sedeIds[0] ?? null,
        sedeIds: value.sedeIds,
        equipoIds: value.equipoIds,
        workspaceId: activeWorkspaceId,
        visibleEntrenadores: value.visibleEntrenadores,
        entrenadorIds: value.entrenadorIds,
        externalUrl: value.mode === "link" ? value.externalUrl : null,
      })
      if (result) {
        setFormOpen(false)
        setEditingDocumento(null)
      }
      return
    }
    if (!formProvider) return

    const result = value.mode === "file" && value.file
      ? await documentos.createOne({
          file: value.file,
          titulo: value.titulo,
          categoriaDoc: value.categoriaDoc || null,
          sedeId: value.sedeIds[0] ?? null,
          sedeIds: value.sedeIds,
          equipoIds: value.equipoIds,
          workspaceId: activeWorkspaceId,
          visibleEntrenadores: value.visibleEntrenadores,
          entrenadorIds: value.entrenadorIds,
        })
      : await documentos.createLink({
          titulo: value.titulo,
          categoriaDoc: value.categoriaDoc || null,
          externalUrl: value.externalUrl,
          sedeId: value.sedeIds[0] ?? null,
          sedeIds: value.sedeIds,
          equipoIds: value.equipoIds,
          workspaceId: activeWorkspaceId,
          visibleEntrenadores: value.visibleEntrenadores,
          entrenadorIds: value.entrenadorIds,
        })

    if (result) setFormOpen(false)
  }

  function handleEdit(asset: ContentAsset) {
    if (asset.provider === "external_legacy") return
    const document = getDocumentoForAsset(asset)
    if (!document) return

    setEditingDocumento(document)
    setFormProvider(asset.provider)
    setFormOpen(true)
  }

  async function handleDelete(asset: ContentAsset) {
    if (asset.provider === "external_legacy") return
    const document = getDocumentoForAsset(asset)
    if (!document) return
    const confirmed = window.confirm(
      `¿Eliminar “${document.titulo}”? Esta acción no se puede deshacer.`,
    )
    if (!confirmed) return

    await documentos.deleteOne(document.id)
  }

  const formLoading = editingDocumento
    ? documentos.updateLoading
    : formProvider === "supabase_storage"
      ? documentos.createLoading
      : documentos.createLinkLoading
  const formErrorMessage = editingDocumento
    ? documentos.updateErrorMessage
    : formProvider === "supabase_storage"
      ? documentos.createErrorMessage
      : documentos.createLinkErrorMessage

  function createProviderTab(
    provider: DocumentoProvider,
    catalog: typeof youtube,
  ): DocumentoProviderTab {
    if (catalog.loading) return { state: "loading", count: catalog.count ?? 0 }
    if (catalog.errorMessage) {
      return {
        state: "error",
        count: 0,
        errorMessage: catalog.errorMessage,
        onRetry: () => void catalog.refetch(),
      }
    }
    if (!catalog.assets.length && provider === "supabase_storage") {
      return {
        state: "data",
        count: catalog.count ?? 0,
        children: (
          <section aria-label="Configurar almacenamiento" className="space-y-5 rounded-lg border border-dashed p-6">
            <DocumentoProviderGuide provider={provider} />
            <StorageUsageCard
              provider={provider}
              workspaceId={activeWorkspaceId}
              canWrite={puedeMutar}
              onUpload={() => handleCreate(provider)}
            />
          </section>
        ),
      }
    }
    if (!catalog.assets.length) {
      return {
        state: catalog.hasProviderDataInWorkspace
          ? "empty-filtered"
          : "empty-setup",
        count: catalog.count ?? 0,
        onClearFilters: sedeId ? () => setActiveSede(null) : undefined,
      }
    }
    return {
      state: "data",
      count: catalog.count ?? catalog.assets.length,
      children: (
        <div className="space-y-5">
          <DocumentoProviderList
            provider={provider}
            assets={catalog.assets}
            page={pages[provider]}
            total={catalog.count}
            canWrite={puedeGestionarDocumentos}
            associationsByAssetId={associationsByAssetId}
            actionLoading={documentos.deleteLoading}
            onPageChange={(page) =>
              setPages((current) => ({ ...current, [provider]: page }))
            }
            onPreview={setPreviewAsset}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          {provider === "supabase_storage" ? (
            <StorageUsageCard
              provider={provider}
              workspaceId={activeWorkspaceId}
              canWrite={puedeMutar}
              onUpload={() => handleCreate(provider)}
            />
          ) : null}
        </div>
      ),
    }
  }

  const providers = {
    youtube: createProviderTab("youtube", youtube),
    google_drive: createProviderTab("google_drive", googleDrive),
    supabase_storage: createProviderTab("supabase_storage", storage),
  }

  return (
    <div>
      <PageHeader title="Documentos" />
      <DocumentosProviderTabs
        key={formProvider ?? "documentos"}
        providers={providers}
        canWrite={puedeMutar}
        onCreate={handleCreate}
        initialProvider={formProvider ?? "youtube"}
        queryParam="fuente"
      />

      {!legacy.loading && !legacy.errorMessage && legacy.assets.length > 0 ? (
        <section className="mt-8 border-t pt-6" aria-label="Enlaces anteriores">
          <h2 className="text-lg font-semibold">Enlaces anteriores</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Se mantienen visibles durante la transición, sin ofrecerlos como
            una fuente nueva.
          </p>
          <div className="mt-4">
            <DocumentoProviderList
              provider="external_legacy"
              assets={legacy.assets}
              page={pages.external_legacy}
              total={legacy.count}
              canWrite={false}
              associationsByAssetId={associationsByAssetId}
              onPageChange={(page) =>
                setPages((current) => ({ ...current, external_legacy: page }))
              }
              onPreview={setPreviewAsset}
            />
          </div>
        </section>
      ) : null}

      <DocumentoPreviewDialog
        asset={previewAsset}
        open={previewAsset !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewAsset(null)
        }}
      />
      <DocumentoForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingDocumento(null)
        }}
        title={editingDocumento ? "Editar documento" : formProvider ? providerTitles[formProvider] : "Añadir documento"}
        initialValue={editingDocumento}
        sourceProvider={formProvider ?? undefined}
        loading={formLoading}
        errorMessage={formErrorMessage}
        onSubmit={handleFormSubmit}
      />
    </div>
  )
}
