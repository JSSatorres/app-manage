"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useSedes } from "@/hooks/useSedes";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import type { Sede } from "@/types/sedes";
import { SedeForm } from "./SedeForm";

export function SedesListView() {
  const { refresh } = useWorkspaceContext();
  const {
    data,
    loading,
    errorMessage,
    createOne,
    updateOne,
    deleteOne,
    createLoading,
    updateLoading,
    createErrorMessage,
    updateErrorMessage,
    refetch,
  } = useSedes();

  const runMutations = async (fn: () => Promise<unknown>) => {
    await fn();
    await refetch();
    await refresh();
  };

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Sede | null>(null);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<Sede | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const columns = useMemo<Column<Sede>[]>(() => {
    return [
      { key: "nombre", header: "Nombre", sortable: true, accessor: (r) => r.nombre },
      { key: "direccion", header: "Dirección", sortable: true, accessor: (r) => r.direccion ?? "" },
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
  }, []);

  return (
    <div>
      <PageHeader
        title="Sedes"
        description="Gestión de sedes deportivas"
        action={
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Nueva
          </Button>
        }
      />


      {errorMessage && <p className="mb-4 text-sm text-destructive">{errorMessage}</p>}

      <DataTable
        data={data ?? []}
        columns={columns}
        loading={loading}
        rowKey={(r) => r.id}
        emptyTitle="No hay sedes"
        emptyDescription="Crea la primera sede para empezar."
      />

      <SedeForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
          if (!open) setFormErrorMessage(null);
        }}
        title={editing ? "Editar sede" : "Nueva sede"}
        initialValue={editing}
        loading={editing ? updateLoading : createLoading}
        errorMessage={formErrorMessage ?? (editing ? updateErrorMessage : createErrorMessage)}
        onSubmit={async (value) => {
          setFormErrorMessage(null);
          if (editing) {
            await runMutations(async () =>
              updateOne(editing.id, {
                nombre: value.nombre,
                direccion: value.direccion || null,
              }),
            );
            setFormOpen(false);
            setEditing(null);
            return;
          }

          await runMutations(async () =>
            createOne({
              nombre: value.nombre,
              direccion: value.direccion || null,
            }),
          );
          setFormOpen(false);
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Eliminar sede"
        description={`Se eliminará \"${deleting?.nombre ?? ""}\". Esto puede borrar datos asociados. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deletingLoading}
        onConfirm={async () => {
          if (!deleting) return;
          setDeletingLoading(true);
          await runMutations(async () => deleteOne(deleting.id));
          setDeletingLoading(false);
          setConfirmOpen(false);
          setDeleting(null);
        }}
      />
    </div>
  );
}

