"use client"

import { useMemo, useState } from "react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DocumentoPreviewDialog } from "./DocumentoPreviewDialog"
import { DocumentoForm, type DocumentoFormSubmit } from "./DocumentoForm"
import { DocumentoProviderList } from "./DocumentoProviderList"
import { DocumentoUploadMethodDialog } from "./DocumentoUploadMethodDialog"
import { StorageUsageCard } from "./StorageUsageCard"
import type { DocumentoProvider } from "./DocumentoProviderEmptyState"
import { useContentAssets } from "@/hooks/useContentAssets"
import { useDocumentos } from "@/hooks/useDocumentos"
import { useAuth } from "@/hooks/useAuth"
import { useEquiposLookup } from "@/hooks/useEquiposLookup"
import { useSedesLookup } from "@/hooks/useSedesLookup"
import { Button } from "@/components/ui/button"
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
  const { activeSede, activeWorkspaceId, rol, isEntrenador } =
    useWorkspaceContext()
  const { user } = useAuth()
  const puedeMutar = can(rol, "documentos", "mutate")
  const [previewAsset, setPreviewAsset] = useState<ContentAsset | null>(null)
  const [formProvider, setFormProvider] = useState<DocumentoProvider | null>(null)
  const [editingDocumento, setEditingDocumento] = useState<Documento | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [uploadMethodOpen, setUploadMethodOpen] = useState(false)
  const sedeId = activeSede?.id ?? null
  const scopeKey = `${activeWorkspaceId ?? "sin-workspace"}:${sedeId ?? "todas"}`
  const [paginationState, setPaginationState] = useState<Record<string, number>>({})
  const page = paginationState[scopeKey] ?? 0
  const sedeIds = useMemo(() => (sedeId ? [sedeId] : []), [sedeId])
  const documentos = useDocumentos(
    sedeIds,
    activeWorkspaceId,
    isEntrenador ? (user?.id ?? null) : null,
  )
  const sedesLookup = useSedesLookup()
  const equiposLookup = useEquiposLookup(sedeIds)
  const contentAssetIds = useMemo(
    () =>
      sedeId
        ? Array.from(
            new Set(
              (documentos.data ?? [])
                .map((document) => document.contentAssetId)
                .filter((assetId): assetId is string => assetId !== null),
            ),
          )
        : undefined,
    [documentos.data, sedeId],
  )
  const catalog = useContentAssets(activeWorkspaceId, {
    sedeId,
    assetIds: contentAssetIds,
    pagination: { limit: PAGE_SIZE, offset: page * PAGE_SIZE },
  })
  const editorialLoading = Boolean(sedeId && documentos.loading)
  const editorialErrorMessage = sedeId ? documentos.errorMessage : null
  const loading = catalog.loading || editorialLoading
  const loadErrorMessage = [editorialErrorMessage, catalog.errorMessage]
    .filter((message): message is string => Boolean(message))
    .join(" ")

  const assets = useMemo(
    () => Array.from(new Map(catalog.assets.map((asset) => [asset.id, asset])).values()),
    [catalog.assets],
  )

  const associationsByAssetId = useMemo(() => {
    const sedeNameById = new Map(
      (sedesLookup.data ?? []).map((sede) => [sede.id, sede.nombre]),
    )
    const equipoNameById = new Map(
      (equiposLookup.data ?? []).map((equipo) => [equipo.id, equipo.nombre]),
    )
    const documentsByAsset = new Map<string, Documento>()

    for (const document of documentos.data ?? []) {
      if (document.contentAssetId) {
        documentsByAsset.set(document.contentAssetId, document)
      }
    }

    const result: Record<
      string,
      { sedes: string[]; equipos: string[]; visibleEntrenadores: boolean; esGlobal: boolean }
    > = {}
    for (const asset of assets) {
      const document = documentsByAsset.get(asset.id)
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
        esGlobal: documentSedeIds.length === 0,
      }
    }
    return result
  }, [assets, documentos.data, equiposLookup.data, sedesLookup.data])

  const documentsByAsset = useMemo(() => {
    const result = new Map<string, Documento>()
    for (const document of documentos.data ?? []) {
      if (document.contentAssetId) result.set(document.contentAssetId, document)
    }
    return result
  }, [documentos.data])

  const titlesByAssetId = useMemo(() => {
    const result: Record<string, string> = {}
    for (const [assetId, document] of documentsByAsset) {
      const titulo = document.titulo?.trim() || document.fileName?.trim()
      if (titulo) result[assetId] = titulo
    }
    return result
  }, [documentsByAsset])

  const puedeGestionarDocumentos = puedeMutar && !isEntrenador

  function getDocumentoForAsset(asset: ContentAsset) {
    return documentsByAsset.get(asset.id)
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

  function handleUploadRequest() {
    setUploadMethodOpen(true)
  }

  function handlePageChange(nextPage: number) {
    setPaginationState((current) => ({
      ...current,
      [scopeKey]: Math.max(0, nextPage),
    }))
  }

  function handleLoadRetry() {
    if (editorialErrorMessage) void documentos.refetch()
    if (catalog.errorMessage) void catalog.refetch()
  }

  return (
    <div>
      <PageHeader title="Documentos" />
      <div className="mt-6 space-y-5">
        {puedeMutar ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleUploadRequest}>
              Subir
            </Button>
          </div>
        ) : null}
        {loadErrorMessage ? (
          <section
            role="alert"
            className="flex items-center justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4"
          >
            <p className="text-sm text-destructive">{loadErrorMessage}</p>
            <Button type="button" variant="outline" onClick={handleLoadRetry}>
              Reintentar
            </Button>
          </section>
        ) : null}
        {assets.length > 0 ? (
          <DocumentoProviderList
            assets={assets}
            page={page}
            total={catalog.count}
            canWrite={puedeGestionarDocumentos}
            associationsByAssetId={associationsByAssetId}
            titlesByAssetId={titlesByAssetId}
            actionLoading={documentos.deleteLoading}
            onPageChange={handlePageChange}
            onPreview={setPreviewAsset}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ) : loading ? (
          <section role="status" className="rounded-lg border p-6">
            <p className="text-sm text-muted-foreground">Cargando documentos…</p>
          </section>
        ) : loadErrorMessage ? null : (
          <section className="rounded-lg border border-dashed p-6">
            <p className="text-lg font-semibold">Sube documentos a tu manera</p>
          </section>
        )}
        <StorageUsageCard
          provider="supabase_storage"
          workspaceId={activeWorkspaceId}
          canWrite={puedeMutar}
          onUpload={() => handleCreate("supabase_storage")}
        />
      </div>

      <DocumentoPreviewDialog
        asset={previewAsset}
        open={previewAsset !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewAsset(null)
        }}
      />
      <DocumentoUploadMethodDialog
        open={uploadMethodOpen}
        onOpenChange={setUploadMethodOpen}
        onSelect={handleCreate}
      />
      <DocumentoForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingDocumento(null)
        }}
        title={editingDocumento ? "Editar documento" : formProvider ? providerTitles[formProvider] : "Añadir documento"}
        initialValue={editingDocumento}
        defaultSedeIds={sedeIds}
        sourceProvider={formProvider ?? undefined}
        loading={formLoading}
        errorMessage={formErrorMessage}
        onSubmit={handleFormSubmit}
      />
    </div>
  )
}
