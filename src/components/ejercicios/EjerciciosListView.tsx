"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useEjercicios } from "@/hooks/useEjercicios";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import type { Ejercicio } from "@/types/ejercicios";
import { EjercicioForm } from "./EjercicioForm";

export function EjerciciosListView() {
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
  } = useEjercicios(activeSede?.id ?? null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Ejercicio | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<Ejercicio | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const columns = useMemo<Column<Ejercicio>[]>(() => {
    return [
      { key: "titulo", header: "Título", sortable: true, accessor: (r) => r.titulo },
      {
        key: "objetivoPrincipal",
        header: "Objetivo",
        sortable: true,
        accessor: (r) => r.objetivoPrincipal ?? "",
      },
      {
        key: "esGlobal",
        header: "Global",
        sortable: true,
        accessor: (r) => (r.esGlobal ? "Sí" : "No"),
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
  }, []);

  return (
    <div>
      <PageHeader
        title="Ejercicios"
        description="Biblioteca de ejercicios"
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

      {errorMessage && <p className="mb-4 text-sm text-destructive">{errorMessage}</p>}

      <DataTable
        data={data ?? []}
        columns={columns}
        loading={loading}
        rowKey={(r) => r.id}
        emptyTitle="No hay ejercicios"
        emptyDescription="Crea el primer ejercicio."
      />

      <EjercicioForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        title={editing ? "Editar ejercicio" : "Nuevo ejercicio"}
        initialValue={editing}
        loading={editing ? updateLoading : createLoading}
        onSubmit={async (value) => {
          const numero = value.numeroJugadoresMin ? Number(value.numeroJugadoresMin) : null;
          const payload = {
            titulo: value.titulo,
            objetivoPrincipal: value.objetivoPrincipal || null,
            numeroJugadoresMin: Number.isFinite(numero as number) ? numero : null,
            esGlobal: value.esGlobal,
            sedePropietariaId: value.esGlobal ? null : (value.sedePropietariaId || activeSede?.id || null),
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
        title="Eliminar ejercicio"
        description={`Se eliminará "${deleting?.titulo ?? ""}". Esta acción no se puede deshacer.`}
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
