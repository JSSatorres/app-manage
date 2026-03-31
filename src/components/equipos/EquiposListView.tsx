"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useEquipos } from "@/hooks/useEquipos";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import type { Equipo } from "@/types/equipos";
import { EquipoForm } from "./EquipoForm";

export function EquiposListView() {
  const { activeWorkspaceId } = useWorkspaceContext();
  const { data, loading, errorMessage, createOne, updateOne, deleteOne, createLoading, updateLoading } =
    useEquipos(activeWorkspaceId);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Equipo | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<Equipo | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const columns = useMemo<Column<Equipo>[]>(() => {
    return [
      { key: "nombre", header: "Nombre", sortable: true, accessor: (r) => r.nombre },
      { key: "categoria", header: "Categoría", sortable: true, accessor: (r) => r.categoria ?? "" },
      { key: "sedeId", header: "SedeId", sortable: true, accessor: (r) => r.sedeId },
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
        title="Equipos"
        description="Gestión de equipos"
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

      {!activeWorkspaceId && (
        <p className="mb-4 text-sm text-muted-foreground">Selecciona un espacio de trabajo arriba.</p>
      )}
      {errorMessage && <p className="mb-4 text-sm text-destructive">{errorMessage}</p>}

      <DataTable
        data={data ?? []}
        columns={columns}
        loading={loading}
        rowKey={(r) => r.id}
        emptyTitle="No hay equipos"
        emptyDescription="Crea el primer equipo."
      />

      <EquipoForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        title={editing ? "Editar equipo" : "Nuevo equipo"}
        workspaceId={activeWorkspaceId}
        initialValue={editing}
        loading={editing ? updateLoading : createLoading}
        onSubmit={async (value) => {
          const payload = {
            nombre: value.nombre,
            categoria: value.categoria || null,
            sedeId: value.sedeId,
            entrenadorPrincipalId: editing?.entrenadorPrincipalId ?? null,
            entrenadorAdjuntoId: editing?.entrenadorAdjuntoId ?? null,
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
        title="Eliminar equipo"
        description={`Se eliminará \"${deleting?.nombre ?? ""}\". Esta acción no se puede deshacer.`}
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

