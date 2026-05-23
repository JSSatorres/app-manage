"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import { useDocumentos } from "@/hooks/useDocumentos";
import { useSedesLookup } from "@/hooks/useSedesLookup";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import type { Documento } from "@/types/documentos";
import { DocumentoForm } from "./DocumentoForm";
import { MobileCardRow } from "@/components/shared/MobileCardRow";
import { Badge } from "@/components/ui/badge";

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

  const columns = useMemo<Column<Documento>[]>(() => {
    return [
      { key: "titulo", header: "Título", sortable: true, accessor: (r) => r.titulo },
      { key: "categoriaDoc", header: "Categoría", sortable: true, accessor: (r) => r.categoriaDoc ?? "" },
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
  }, [sedeNameById]);

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

      <DataTable
        data={data ?? []}
        columns={columns}
        loading={loading}
        rowKey={(r) => r.id}
        emptyTitle="No hay documentos"
        emptyDescription="Crea el primer documento."
        onRowClick={(row) => {
          setEditing(row);
          setFormOpen(true);
        }}
        mobileCard={(row) => (
          <MobileCardRow
            icon={FileText}
            title={row.titulo}
            meta={row.sedeId ? sedeNameById.get(row.sedeId) ?? undefined : undefined}
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
          const payload = {
            titulo: value.titulo,
            categoriaDoc: value.categoriaDoc || null,
            driveFileId: value.driveFileId || null,
            sedeId: value.sedeId || null,
          };

          if (editing) {
            await updateOne(editing.id, payload);
            setFormOpen(false);
            setEditing(null);
            return;
          }

          await createOne(payload);
          setFormOpen(false);
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Eliminar documento"
        description={`Se eliminará \"${deleting?.titulo ?? ""}\". Esta acción no se puede deshacer.`}
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

