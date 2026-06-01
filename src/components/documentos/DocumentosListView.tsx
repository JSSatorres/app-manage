"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import {
  Plus,
  Pencil,
  Trash2,
  FileText,
  Download,
  Globe,
  Link2,
} from "lucide-react"
import { useDocumentos } from "@/hooks/useDocumentos"
import { useSedesLookup } from "@/hooks/useSedesLookup"
import { useWorkspaceContext } from "@/lib/workspaceContext"
import { useAuth } from "@/hooks/useAuth"
import { can } from "@/lib/permisos"
import { getDocumentoOpenUrl } from "@/services/documentos.service"
import { documentoTipoLabel } from "@/lib/documentoLinks"
import type { Documento } from "@/types/documentos"
import { DocumentoForm } from "./DocumentoForm"
import { MobileCardRow } from "@/components/shared/MobileCardRow"
import { Badge } from "@/components/ui/badge"

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentosListView() {
  const { activeSede, activeWorkspaceId, rol, isEntrenador } =
    useWorkspaceContext()
  const { user } = useAuth()
  const puedeMutar = can(rol, "documentos", "mutate")
  const entrenadorUserId = isEntrenador ? (user?.id ?? null) : null
  const {
    data,
    loading,
    errorMessage,
    createOne,
    createLink,
    updateOne,
    deleteOne,
    createLoading,
    createLinkLoading,
    updateLoading,
  } = useDocumentos(
    activeSede ? [activeSede.id] : [],
    activeWorkspaceId,
    entrenadorUserId,
  )
  const sedesLookup = useSedesLookup()

  const sedeNameById = useMemo(() => {
    const map = new Map<string, string>()
    ;(sedesLookup.data ?? []).forEach((s) => map.set(s.id, s.nombre))
    return map
  }, [sedesLookup.data])

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Documento | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState<Documento | null>(null)
  const [deletingLoading, setDeletingLoading] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showGlobal, setShowGlobal] = useState(false)

  const handleOpen = async (doc: Documento) => {
    setDownloadingId(doc.id)
    setActionError(null)
    const { data: url, error } = await getDocumentoOpenUrl(doc)
    setDownloadingId(null)
    if (error || !url) {
      setActionError(error?.message ?? "No se pudo abrir el documento.")
      return
    }
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const columns = useMemo<Column<Documento>[]>(() => {
    return [
      {
        key: "titulo",
        header: "Título",
        sortable: true,
        accessor: (r) => r.titulo,
      },
      {
        key: "extension",
        header: "Tipo",
        sortable: true,
        accessor: (r) => documentoTipoLabel(r),
        render: (r) => (
          <span className="inline-flex items-center gap-1.5">
            {r.sourceType === "link" && (
              <Link2 className="size-3.5 text-muted-foreground" />
            )}
            {documentoTipoLabel(r)}
          </span>
        ),
      },
      {
        key: "categoriaDoc",
        header: "Categoría",
        sortable: true,
        accessor: (r) => r.categoriaDoc ?? "",
      },
      {
        key: "sizeBytes",
        header: "Tamaño",
        sortable: true,
        accessor: (r) => r.sizeBytes ?? 0,
        render: (r) => (
          <span className="text-muted-foreground">
            {formatBytes(r.sizeBytes)}
          </span>
        ),
      },
      {
        key: "sedeId",
        header: "Sedes",
        sortable: true,
        accessor: (r) => {
          const ids =
            r.sedeIds.length > 0 ? r.sedeIds : r.sedeId ? [r.sedeId] : []
          return ids.map((id) => sedeNameById.get(id) ?? "—").join(", ")
        },
        render: (r) => {
          const ids =
            r.sedeIds.length > 0 ? r.sedeIds : r.sedeId ? [r.sedeId] : []
          if (ids.length === 0) {
            return <span className="text-muted-foreground">Global</span>
          }
          const names = ids.map((id) => sedeNameById.get(id) ?? "—")
          return <span>{names.join(", ")}</span>
        },
      },
      {
        key: "equipos",
        header: "Equipos",
        accessor: (r) => r.equipoIds.length,
        render: (r) =>
          r.equipoIds.length === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <Badge variant="secondary" className="text-[11px]">
              {r.equipoIds.length} equipo{r.equipoIds.length === 1 ? "" : "s"}
            </Badge>
          ),
      },
      {
        key: "acciones",
        header: "Acciones",
        render: (row) => (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                downloadingId === row.id ||
                (row.sourceType === "link"
                  ? !row.externalUrl
                  : !row.storagePath)
              }
              onClick={(e) => {
                e.stopPropagation()
                void handleOpen(row)
              }}
            >
              {row.sourceType === "link" ? (
                <Link2 className="mr-1 size-4" />
              ) : (
                <Download className="mr-1 size-4" />
              )}
              {downloadingId === row.id ? "Abriendo…" : "Ver"}
            </Button>
            {puedeMutar && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditing(row)
                    setFormOpen(true)
                  }}
                >
                  <Pencil className="mr-1 size-4" />
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleting(row)
                    setConfirmOpen(true)
                  }}
                >
                  <Trash2 className="mr-1 size-4" />
                  Eliminar
                </Button>
              </>
            )}
          </div>
        ),
      },
    ]
  }, [sedeNameById, downloadingId, puedeMutar])

  const filteredData = useMemo(() => {
    if (!data) return []
    if (!showGlobal) {
      return data.filter((doc) => doc.sedeIds.length > 0 || !doc.sedeId)
    }
    return data
  }, [data, showGlobal])

  return (
    <div>
      <PageHeader
        title="Documentos"
        action={
          puedeMutar ? (
            <Button
              type="button"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus className="mr-2 size-4" />
              Nuevo
            </Button>
          ) : undefined
        }
      />

      {!activeSede && (
        <p className="mb-4 text-sm text-muted-foreground">
          No tienes una sede asignada.
        </p>
      )}
      {errorMessage && (
        <p className="mb-4 text-sm text-destructive">{errorMessage}</p>
      )}
      {actionError && (
        <p className="mb-4 text-sm text-destructive">{actionError}</p>
      )}

      <DataTable
        data={showGlobal ? (data ?? []) : filteredData}
        columns={columns}
        loading={loading}
        rowKey={(r) => r.id}
        emptyTitle="No hay documentos"
        emptyDescription="Sube el primer documento."
        searchAdornment={
          !isEntrenador ? (
            <Button
              type="button"
              variant={showGlobal ? "default" : "outline"}
              size="sm"
              onClick={() => setShowGlobal((v) => !v)}
            >
              <Globe className="mr-1.5 size-4" />
              {showGlobal ? "Quitar globales" : "Ver globales"}
            </Button>
          ) : undefined
        }
        onRowClick={(row) => {
          void handleOpen(row)
        }}
        mobileCard={(row) => (
          <MobileCardRow
            icon={FileText}
            title={row.titulo}
            meta={[
              documentoTipoLabel(row),
              row.sourceType === "link" ? null : formatBytes(row.sizeBytes),
              row.sedeId ? (sedeNameById.get(row.sedeId) ?? null) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
            badge={
              row.categoriaDoc ? (
                <Badge variant="secondary" className="text-[11px]">
                  {row.categoriaDoc}
                </Badge>
              ) : undefined
            }
          />
        )}
      />

      <DocumentoForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        title={editing ? "Editar documento" : "Nuevo documento"}
        initialValue={editing}
        loading={editing ? updateLoading : createLoading || createLinkLoading}
        onSubmit={async (value) => {
          const sedePrincipal = value.sedeIds[0] ?? null

          if (editing) {
            await updateOne(editing.id, {
              titulo: value.titulo,
              categoriaDoc: value.categoriaDoc || null,
              sedeId: sedePrincipal,
              sedeIds: value.sedeIds,
              equipoIds: value.equipoIds,
              visibleEntrenadores: value.visibleEntrenadores,
              entrenadorIds: value.entrenadorIds,
              workspaceId: activeWorkspaceId,
              // En enlaces se permite editar la URL; en archivos se ignora.
              externalUrl:
                value.mode === "link" ? value.externalUrl : undefined,
            })
            setFormOpen(false)
            setEditing(null)
            return
          }

          if (value.mode === "link") {
            if (!value.externalUrl) return
            await createLink({
              externalUrl: value.externalUrl,
              titulo: value.titulo,
              categoriaDoc: value.categoriaDoc || null,
              sedeId: sedePrincipal ?? activeSede?.id ?? null,
              sedeIds: value.sedeIds,
              equipoIds: value.equipoIds,
              workspaceId: activeWorkspaceId,
              visibleEntrenadores: value.visibleEntrenadores,
              entrenadorIds: value.entrenadorIds,
            })
            setFormOpen(false)
            return
          }

          if (!value.file) return
          await createOne({
            file: value.file,
            titulo: value.titulo,
            categoriaDoc: value.categoriaDoc || null,
            sedeId: sedePrincipal ?? activeSede?.id ?? null,
            sedeIds: value.sedeIds,
            equipoIds: value.equipoIds,
            workspaceId: activeWorkspaceId,
            visibleEntrenadores: value.visibleEntrenadores,
            entrenadorIds: value.entrenadorIds,
          })
          setFormOpen(false)
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Eliminar documento"
        description={`Se eliminará "${deleting?.titulo ?? ""}"${deleting?.sourceType === "link" ? "" : " y su archivo"}. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deletingLoading}
        onConfirm={async () => {
          if (!deleting) return
          setDeletingLoading(true)
          await deleteOne(deleting.id)
          setDeletingLoading(false)
          setConfirmOpen(false)
          setDeleting(null)
        }}
      />
    </div>
  )
}
