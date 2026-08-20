"use client"

import { useMemo } from "react"
import { Eye, Pencil, Trash2 } from "lucide-react"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ContentAsset, ContentAssetStatus, ContentProvider } from "@/types/content-assets"

export type DocumentoAssetAssociations = {
  sedes: string[]
  equipos: string[]
  visibleEntrenadores: boolean
  esGlobal: boolean
}

type DocumentoProviderListProps = {
  provider?: ContentProvider
  assets: ContentAsset[]
  page?: number
  total?: number | null
  onPageChange?: (page: number) => void
  onPreview: (asset: ContentAsset) => void
  canWrite?: boolean
  associationsByAssetId?: Record<string, DocumentoAssetAssociations>
  titlesByAssetId?: Record<string, string>
  actionLoading?: boolean
  onEdit?: (asset: ContentAsset) => void
  onDelete?: (asset: ContentAsset) => void
}

const providerLabels: Record<ContentProvider, string> = {
  youtube: "YouTube",
  google_drive: "Google Drive",
  supabase_storage: "Almacenamiento",
  external_legacy: "Enlace anterior",
}

const statusLabels: Record<ContentAssetStatus, string> = {
  pending_validation: "Pendiente",
  reserved: "Reservado",
  uploading: "Subiendo",
  processing: "Procesando",
  ready: "Listo",
  unavailable: "No disponible",
  rejected: "Rechazado",
  failed: "Fallido",
  deleting: "Eliminando",
  deleted: "Eliminado",
}

function statusVariant(status: ContentAssetStatus) {
  if (status === "failed" || status === "rejected") return "destructive" as const
  if (status === "ready") return "secondary" as const
  return "outline" as const
}

function getProviderFallbackTitle(asset: ContentAsset) {
  switch (asset.provider) {
    case "youtube":
      return "Vídeo de YouTube"
    case "google_drive":
      return "Archivo de Google Drive"
    case "supabase_storage":
      return "Archivo privado"
    case "external_legacy":
      return "Enlace anterior"
  }
}

function getAssetTitle(asset: ContentAsset, titlesByAssetId: Record<string, string>) {
  const titulo = titlesByAssetId[asset.id]?.trim()
  return titulo ? titulo : getProviderFallbackTitle(asset)
}

function getAssetMetadata(asset: ContentAsset, hasTitle: boolean) {
  switch (asset.provider) {
    case "youtube":
      return hasTitle ? "Vídeo de YouTube" : `Vídeo ${asset.externalResourceId}`
    case "google_drive":
      return hasTitle
        ? "Archivo de Google Drive"
        : asset.fileId
          ? `Archivo ${asset.fileId}`
          : "Archivo de Drive"
    case "supabase_storage":
      return `${formatBytes(asset.sizeBytes)} · ${asset.mimeType}`
    case "external_legacy":
      return "Enlace conservado de una fuente anterior"
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getAssociationsLabel(associations: DocumentoAssetAssociations | undefined) {
  if (!associations) return "Sin asociaciones configuradas"
  const values = [...associations.sedes, ...associations.equipos]
  if (associations.esGlobal && values.length === 0) return "Todas las sedes (global)"
  return values.length ? values.join(" · ") : "Sin asociaciones configuradas"
}

function getProviderStorageMessage(provider: ContentProvider) {
  if (provider === "youtube") return "Almacenado en YouTube · no consume espacio de tu plan."
  if (provider === "google_drive") return "Almacenado en Google Drive · no consume espacio de tu plan."
  if (provider === "supabase_storage") {
    return "Archivo privado almacenado en la plataforma · consume cuota del club."
  }
  return "Enlace conservado durante la transición de fuentes."
}

export function DocumentoProviderList({
  provider,
  assets,
  page,
  total,
  onPageChange,
  onPreview,
  canWrite = false,
  associationsByAssetId = {},
  titlesByAssetId = {},
  actionLoading = false,
  onEdit,
  onDelete,
}: DocumentoProviderListProps) {
  const columns = useMemo<Column<ContentAsset>[]>(
    () => [
      {
        key: "titulo",
        header: "Contenido",
        accessor: (asset) => getAssetTitle(asset, titlesByAssetId),
        render: (asset) => {
          const hasTitle = Boolean(titlesByAssetId[asset.id]?.trim())
          return (
            <div className="space-y-1">
              <p className="font-medium">{getAssetTitle(asset, titlesByAssetId)}</p>
              <p className="text-xs text-muted-foreground">{getAssetMetadata(asset, hasTitle)}</p>
            </div>
          )
        },
      },
      {
        key: "provider",
        header: "Proveedor",
        accessor: (asset) => providerLabels[asset.provider],
        render: (asset) => <Badge variant="outline">{providerLabels[asset.provider]}</Badge>,
      },
      {
        key: "status",
        header: "Estado",
        accessor: (asset) => statusLabels[asset.status],
        render: (asset) => (
          <Badge variant={statusVariant(asset.status)}>{statusLabels[asset.status]}</Badge>
        ),
      },
      {
        key: "asociaciones",
        header: "Asociaciones",
        accessor: (asset) => getAssociationsLabel(associationsByAssetId[asset.id]),
        render: (asset) => {
          const associations = associationsByAssetId[asset.id]
          return (
            <div className="space-y-1">
              <p>{getAssociationsLabel(associations)}</p>
              {associations ? (
                <p className="text-xs text-muted-foreground">
                  {associations.visibleEntrenadores
                    ? "Visible para entrenadores"
                    : "Solo gestores y entrenadores asignados"}
                </p>
              ) : null}
            </div>
          )
        },
      },
      {
        key: "acciones",
        header: "Acciones",
        render: (asset) => {
          const title = getAssetTitle(asset, titlesByAssetId)
          return (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Ver ${title}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onPreview(asset)
                }}
              >
                <Eye className="mr-1 size-4" />
                Ver
              </Button>
              {canWrite && asset.provider !== "external_legacy" && onEdit ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`Editar ${title}`}
                  disabled={actionLoading}
                  onClick={(event) => {
                    event.stopPropagation()
                    onEdit(asset)
                  }}
                >
                  <Pencil className="mr-1 size-4" />
                  Editar
                </Button>
              ) : null}
              {canWrite && asset.provider !== "external_legacy" && onDelete ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  aria-label={`Eliminar ${title}`}
                  disabled={actionLoading}
                  onClick={(event) => {
                    event.stopPropagation()
                    onDelete(asset)
                  }}
                >
                  <Trash2 className="mr-1 size-4" />
                  Eliminar
                </Button>
              ) : null}
            </div>
          )
        },
      },
    ],
    [actionLoading, associationsByAssetId, canWrite, onDelete, onEdit, onPreview, titlesByAssetId],
  )

  return (
    <section aria-label={provider ? `Contenido de ${providerLabels[provider]}` : "Lista de documentos"} className="space-y-4">
      {provider ? (
        <p className="text-sm text-muted-foreground">{getProviderStorageMessage(provider)}</p>
      ) : null}
      <DataTable
        data={assets}
        columns={columns}
        rowKey={(asset) => asset.id}
        searchable={false}
        page={page}
        total={total ?? assets.length}
        pageSize={10}
        onPageChange={onPageChange}
        emptyTitle="No hay contenido disponible"
        emptyDescription="Prueba a cambiar de sede o consulta cómo configurar esta fuente."
        onRowClick={onPreview}
      />
    </section>
  )
}
