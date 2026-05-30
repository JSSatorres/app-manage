"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Plus, Pencil, Trash2, FileText, Download } from "lucide-react";
import { useDocumentos } from "@/hooks/useDocumentos";
import { useSedesLookup } from "@/hooks/useSedesLookup";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import { getDocumentoUrl } from "@/services/documentos.service";
import type { Documento } from "@/types/documentos";
import { DocumentoForm } from "./DocumentoForm";
import { MobileCardRow } from "@/components/shared/MobileCardRow";
import { Badge } from "@/components/ui/badge";

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentosListView() {
  const { activeSede } = useWorkspaceContext();
  const {
    data,
    loading,
    errorMessage,
    createOne,
    updateOne,
    deleteOne,
    createLoading,
    updateLoading,
  } = useDocumentos(activeSede ? [activeSede.id] : []);
  const sedesLookup = useSedesLookup();

  const sedeNameById = useMemo(() => {
    const map = new Map<string, string>();
    (sedesLookup.data ?? []).forEach((s) => map.set(s.id, s.nombre));
    return map;
  }, [sedesLookup.data]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Documento | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<Documento | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleOpen = async (doc: Documento) => {
    if (!doc.storagePath) {
      setActionError("Este documento no tiene archivo asociado.");
      return;
    }
    setDownloadingId(doc.id);
    setActionError(null);
    const { data: url, error } = await getDocumentoUrl(doc.storagePath);
    setDownloadingId(null);
    if (error || !url) {
      setActionError(error?.message ?? "No se pudo abrir el documento.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const columns = useMemo<Column<Documento>[]>(() => {
    return [
      { key: "titulo", header: "Título", sortable: true, accessor: (r) => r.titulo },
      {
        key: "extension",
        header: "Tipo",
        sortable: true,
        accessor: (r) => (r.extension ? r.extension.toUpperCase() : "—"),
      },
      { key: "categoriaDoc", header: "Categoría", sortable: true, accessor: (r) => r.categoriaDoc ?? "" },
      {
        key: "sizeBytes",
        header: "Tamaño",
        sortable: true,
        accessor: (r) => r.sizeBytes ?? 0,
        render: (r) => <span className="text-muted-foreground">{formatBytes(r.sizeBytes)}</span>,
      },
      {
        key: "sedeId",
        header: "Sede",
        sortable: true,
        accessor: (r) => (r.sedeId ? sedeNameById.get(r.sedeId) ?? "—" : ""),
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
              disabled={!row.storagePath || downloadingId === row.id}
              onClick={(e) => {
                e.stopPropagation();
                void handleOpen(row);
              }}
            >
              <Download className="mr-1 size-4" />
              {downloadingId === row.id ? "Abriendo…" : "Ver"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setEditing(row);
                setFormOpen(true);
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
                e.stopPropagation();
                setDeleting(row);
                setConfirmOpen(true);
              }}
            >
              <Trash2 className="mr-1 size-4" />
              Eliminar
            </Button>
          </div>
        ),
      },
    ];
  }, [sedeNameById, downloadingId]);

  return (
    <div>
      <PageHeader
        title="Documentos"
        description="Gestión de documentos"
        action={
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Nuevo
          </Button>
        }
      />

      {!activeSede && (
        <p className="mb-4 text-sm text-muted-foreground">No tienes una sede asignada.</p>
      )}
      {errorMessage && <p className="mb-4 text-sm text-destructive">{errorMessage}</p>}
      {actionError && <p className="mb-4 text-sm text-destructive">{actionError}</p>}

      <DataTable
        data={data ?? []}
        columns={columns}
        loading={loading}
        rowKey={(r) => r.id}
        emptyTitle="No hay documentos"
        emptyDescription="Sube el primer documento."
        onRowClick={(row) => {
          void handleOpen(row);
        }}
        mobileCard={(row) => (
          <MobileCardRow
            icon={FileText}
            title={row.titulo}
            meta={[
              row.extension ? row.extension.toUpperCase() : null,
              formatBytes(row.sizeBytes),
              row.sedeId ? sedeNameById.get(row.sedeId) ?? null : null,
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
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        title={editing ? "Editar documento" : "Nuevo documento"}
        initialValue={editing}
        loading={editing ? updateLoading : createLoading}
        onSubmit={async (value) => {
          if (editing) {
            await updateOne(editing.id, {
              titulo: value.titulo,
              categoriaDoc: value.categoriaDoc || null,
              sedeId: value.sedeId || null,
            });
            setFormOpen(false);
            setEditing(null);
            return;
          }

          if (!value.file) return;
          await createOne({
            file: value.file,
            titulo: value.titulo,
            categoriaDoc: value.categoriaDoc || null,
            sedeId: value.sedeId || activeSede?.id || null,
          });
          setFormOpen(false);
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Eliminar documento"
        description={`Se eliminará \"${deleting?.titulo ?? ""}\" y su archivo. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deletingLoading}
        onConfirm={async () => {
          if (!deleting) return;
          setDeletingLoading(true);
          await deleteOne(deleting.id);
          setDeletingLoading(false);
          setConfirmOpen(false);
          setDeleting(null);
        }}
      />
    </div>
  );
}
