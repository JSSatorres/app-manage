"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Plus, Pencil, Trash2, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSesiones } from "@/hooks/useSesiones";
import { useEquiposLookup } from "@/hooks/useEquiposLookup";
import { useUsuariosLookup } from "@/hooks/useUsuariosLookup";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import type { Sesion } from "@/types/sesiones";
import type { EstadoSesion, PeriodoTemporada } from "@/lib/constants";
import { SesionForm } from "./SesionForm";
import { MobileCardRow } from "@/components/shared/MobileCardRow";

const estadoStyle: Record<string, string> = {
  Realizada: "bg-emerald-100 text-emerald-700",
  Planificada: "bg-blue-100 text-blue-700",
  Borrador: "bg-amber-100 text-amber-700",
  NoRealizada: "bg-rose-100 text-rose-700",
};

function formatFechaCorta(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function SesionesListView() {
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
  } = useSesiones(activeSede ? [activeSede.id] : []);

  const equiposLookup = useEquiposLookup(activeSede ? [activeSede.id] : []);
  const usuariosLookup = useUsuariosLookup();

  const equipoNameById = useMemo(() => {
    const map = new Map<string, string>();
    (equiposLookup.data ?? []).forEach((e) => map.set(e.id, e.nombre));
    return map;
  }, [equiposLookup.data]);

  const entrenadorNameById = useMemo(() => {
    const map = new Map<string, string>();
    (usuariosLookup.data ?? []).forEach((u) => map.set(u.id, u.nombre || u.email));
    return map;
  }, [usuariosLookup.data]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Sesion | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<Sesion | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const columns = useMemo<Column<Sesion>[]>(() => {
    return [
      { key: "fecha", header: "Fecha", sortable: true, accessor: (r) => r.fecha },
      { key: "horaInicio", header: "Hora", sortable: true, accessor: (r) => r.horaInicio ?? "" },
      {
        key: "estado",
        header: "Estado",
        sortable: true,
        accessor: (r) => r.estado,
        render: (r) => {
          const label = r.estado === "NoRealizada" ? "No realizada" : r.estado;
          return (
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", estadoStyle[r.estado] ?? "bg-gray-100 text-gray-700")}>
              {label}
            </span>
          );
        },
      },
      {
        key: "equipoId",
        header: "Equipo",
        sortable: true,
        accessor: (r) => equipoNameById.get(r.equipoId) ?? r.equipoId,
      },
      {
        key: "entrenadorId",
        header: "Entrenador",
        sortable: true,
        accessor: (r) => entrenadorNameById.get(r.entrenadorId) ?? r.entrenadorId,
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
  }, [equipoNameById, entrenadorNameById]);

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

      {!activeSede && (
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
        onRowClick={(row) => {
          setEditing(row);
          setFormOpen(true);
        }}
        mobileCard={(row) => {
          const equipo = equipoNameById.get(row.equipoId) ?? row.equipoId;
          const hora = row.horaInicio ? row.horaInicio.slice(0, 5) : "Sin hora";
          const label = row.estado === "NoRealizada" ? "No realizada" : row.estado;
          return (
            <MobileCardRow
              icon={CalendarDays}
              title={equipo}
              meta={`${hora} · ${formatFechaCorta(row.fecha)}`}
              badge={
                <span
                  className={cn(
                    "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                    estadoStyle[row.estado] ?? "bg-gray-100 text-gray-700",
                  )}
                >
                  {label}
                </span>
              }
            />
          );
        }}
      />

      <SesionForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        title={editing ? "Editar sesión" : "Nueva sesión"}
        sedeIds={activeSede ? [activeSede.id] : []}
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
            periodoTemporada: value.periodoTemporada ? (value.periodoTemporada as PeriodoTemporada) : null,
            objetivoSesion: value.objetivoSesion || null,
            observacionesPrevias: value.observacionesPrevias || null,
            estado: value.estado as EstadoSesion,
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

