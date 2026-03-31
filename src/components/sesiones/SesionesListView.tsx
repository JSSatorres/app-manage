"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useSesiones } from "@/hooks/useSesiones";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import type { Sesion } from "@/types/sesiones";
import { SesionForm } from "./SesionForm";

export function SesionesListView() {
  const { activeWorkspaceId, sedeIds } = useWorkspaceContext();
  const {
    data,
    loading,
    errorMessage,
    createOne,
    updateOne,
    deleteOne,
    createLoading,
    updateLoading,
  } = useSesiones(sedeIds);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Sesion | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<Sesion | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const columns = useMemo<Column<Sesion>[]>(() => {
    return [
      { key: "fecha", header: "Fecha", sortable: true, accessor: (r) => r.fecha },
      { key: "horaInicio", header: "Hora", sortable: true, accessor: (r) => r.horaInicio ?? "" },
      { key: "estado", header: "Estado", sortable: true, accessor: (r) => r.estado },
      { key: "equipoId", header: "EquipoId", sortable: true, accessor: (r) => r.equipoId },
      { key: "entrenadorId", header: "EntrenadorId", sortable: true, accessor: (r) => r.entrenadorId },
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
        title="Sesiones"
        description="Planificador de sesiones (MVP)"
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

      {sedeIds.length === 0 && activeWorkspaceId && (
        <p className="mb-4 text-sm text-muted-foreground">Crea sedes y equipos para planificar sesiones.</p>
      )}
      {errorMessage && <p className="mb-4 text-sm text-destructive">{errorMessage}</p>}

      <DataTable
        data={data ?? []}
        columns={columns}
        loading={loading}
        rowKey={(r) => r.id}
        emptyTitle="No hay sesiones"
        emptyDescription="Crea la primera sesión."
      />

      <SesionForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        title={editing ? "Editar sesión" : "Nueva sesión"}
        sedeIds={sedeIds}
        initialValue={editing}
        loading={editing ? updateLoading : createLoading}
        onSubmit={async (value) => {
          const duracion = value.duracionEstimada ? Number(value.duracionEstimada) : null;
          const microciclo = value.microciclo ? Number(value.microciclo) : null;

          const payload = {
            fecha: value.fecha,
            horaInicio: value.horaInicio || null,
            duracionEstimada: Number.isFinite(duracion as number) ? duracion : null,
            equipoId: value.equipoId,
            entrenadorId: value.entrenadorId,
            microciclo: Number.isFinite(microciclo as number) ? microciclo : null,
            periodoTemporada: value.periodoTemporada ? (value.periodoTemporada as any) : null,
            objetivoSesion: value.objetivoSesion || null,
            observacionesPrevias: value.observacionesPrevias || null,
            estado: value.estado as any,
          };

          if (editing) {
            await updateOne(editing.id, { ...payload, feedbackPostEntreno: editing.feedbackPostEntreno });
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
        title="Eliminar sesión"
        description={`Se eliminará la sesión del ${deleting?.fecha ?? ""}. Esta acción no se puede deshacer.`}
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

