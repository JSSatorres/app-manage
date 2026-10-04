"use client"

import { useMemo } from "react"
import { Eye, HardDrive, Link2, Pencil, PlayCircle, Trash2, Cloud, type LucideIcon } from "lucide-react"
import { RowActionButton, RowActions } from "@/components/shared/RowActionButton"
import { cn } from "@/lib/utils"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { Badge } from "@/components/ui/badge"
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

const providerVisuals: Record<ContentProvider, { icon: LucideIcon; tone: string }> = {
  youtube: { icon: PlayCircle, tone: "bg-destructive/10 text-destructive" },
  google_drive: { icon: Cloud, tone: "bg-info/10 text-info" },
  supabase_storage: { icon: HardDrive, tone: "bg-primary/10 text-primary" },
  external_legacy: { icon: Link2, tone: "bg-secondary text-muted-foreground" },
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
        grow: true,
        accessor: (asset) => getAssetTitle(asset, titlesByAssetId),
        render: (asset) => {
          const hasTitle = Boolean(titlesByAssetId[asset.id]?.trim())
          return (
            <div className="flex min-w-0 items-center gap-2.5">
              <span aria-hidden="true" className={cn("grid size-8 shrink-0 place-items-center rounded-lg", providerVisuals[asset.provider].tone)}>
                {(() => {
                  const ProviderIcon = providerVisuals[asset.provider].icon
                  return <ProviderIcon className="size-4" />
                })()}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">{getAssetTitle(asset, titlesByAssetId)}</p>
                <p className="truncate text-xs font-normal text-muted-foreground">{getAssetMetadata(asset, hasTitle)}</p>
              </div>
            </div>
          )
        },
      },
      {
        key: "provider",
        header: "Proveedor",
        accessor: (asset) => providerLabels[asset.provider],
        render: (asset) => (
          <span className={cn("inline-flex h-[22px] items-center rounded-md px-2 text-[11.5px] font-semibold", providerVisuals[asset.provider].tone)}>
            {providerLabels[asset.provider]}
          </span>
        ),
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
        hideBelow: "lg",
        mobile: "full",
        render: (asset) => {
          const associations = associationsByAssetId[asset.id]
          return (
            <div className="max-w-72 space-y-0.5 whitespace-normal md:min-w-52 max-md:max-w-none">
              <p className="line-clamp-2 md:line-clamp-1">{getAssociationsLabel(associations)}</p>
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
            <RowActions>
              <RowActionButton label={`Ver ${title}`} icon={Eye} tone="info" onClick={() => onPreview(asset)} />
              {canWrite && asset.provider !== "external_legacy" && onEdit ? (
                <RowActionButton
                  label={`Editar ${title}`}
                  icon={Pencil}
                  disabled={actionLoading}
                  onClick={() => onEdit(asset)}
                />
              ) : null}
              {canWrite && asset.provider !== "external_legacy" && onDelete ? (
                <RowActionButton
                  label={`Eliminar ${title}`}
                  icon={Trash2}
                  danger
                  disabled={actionLoading}
                  onClick={() => onDelete(asset)}
                />
              ) : null}
            </RowActions>
          )
        },
      },
    ],
    [actionLoading, associationsByAssetId, canWrite, onDelete, onEdit, onPreview, titlesByAssetId],
  )

  return (
    <section aria-label={provider ? `Contenido de ${providerLabels[provider]}` : "Lista de documentos"} className="space-y-3">
      {provider ? (
        <p className="text-[13px] text-muted-foreground">{getProviderStorageMessage(provider)}</p>
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
