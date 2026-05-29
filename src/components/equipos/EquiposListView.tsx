"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { useEquipos } from "@/hooks/useEquipos";
import { useSedesLookup } from "@/hooks/useSedesLookup";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import type { Equipo } from "@/types/equipos";
import { EquipoForm, type EquipoFormValue } from "./EquipoForm";
import { EquipoDetailDialog } from "./EquipoDetailDialog";
import { MobileCardRow } from "@/components/shared/MobileCardRow";

export function EquiposListView() {
  const { activeWorkspaceId, activeSede } = useWorkspaceContext();
  const sedesLookup = useSedesLookup();
  const {
    data,
    loading,
    errorMessage,
    createOne,
    updateOne,
    deleteOne,
    createLoading,
    updateLoading,
  } = useEquipos(activeWorkspaceId, activeSede?.id);

  const sedeNameById = useMemo(() => {
    const map = new Map<string, string>();
    (sedesLookup.data ?? []).forEach((s) => map.set(s.id, s.nombre));
    return map;
  }, [sedesLookup.data]);

  // Detail (vista)
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewing, setViewing] = useState<Equipo | null>(null);

  // Form (edición)
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Equipo | null>(null);

  // Confirm (eliminar)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<Equipo | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  function openDetail(row: Equipo) {
    setViewing(row);
    setDetailOpen(true);
  }

  function openEdit(row: Equipo) {
    setEditing(row);
    setFormOpen(true);
  }

  function openDelete(row: Equipo) {
    setDeleting(row);
    setConfirmOpen(true);
  }

  const columns = useMemo<Column<Equipo>[]>(() => {
    return [
      { key: "nombre", header: "Nombre", sortable: true, accessor: (r) => r.nombre },
      {
        key: "categoria",
        header: "Categoría",
        sortable: true,
        accessor: (r) => r.categoria ?? "",
        render: (row) =>
          row.categoria ? (
            <Badge variant="secondary" className="text-xs">{row.categoria}</Badge>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          ),
      },
      {
        key: "entrenadores",
        header: "Entrenadores",
        render: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.entrenadorIds.length > 0 ? row.entrenadorIds.length : "—"}
          </span>
        ),
      },
      {
        key: "jugadores",
        header: "Jugadores",
        render: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.jugadorIds.length > 0 ? row.jugadorIds.length : "—"}
          </span>
        ),
      },
      {
        key: "acciones",
        header: "Acciones",
        render: (row) => (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm"
              onClick={(e) => { e.stopPropagation(); openEdit(row); }}>
              <Pencil className="mr-1 size-4" />Editar
            </Button>
            <Button type="button" variant="destructive" size="sm"
              onClick={(e) => { e.stopPropagation(); openDelete(row); }}>
              <Trash2 className="mr-1 size-4" />Eliminar
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
        description={activeSede ? `Equipos de la sede "${activeSede.nombre}"` : "Gestión de equipos"}
        action={
          <Button type="button" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="mr-2 size-4" />Nuevo
          </Button>
        }
      />

      {errorMessage && <p className="mb-4 text-sm text-destructive">{errorMessage}</p>}

      <DataTable
        data={data ?? []}
        columns={columns}
        loading={loading}
        rowKey={(r) => r.id}
        searchable
        searchPlaceholder="Buscar equipos..."
        emptyTitle="No hay equipos"
        emptyDescription="Crea el primer equipo."
        onRowClick={openDetail}
        mobileCard={(row) => {
          const sedeName = sedeNameById.get(row.sedeId);
          const metaParts = [
            sedeName,
            row.entrenadorIds.length ? `${row.entrenadorIds.length} entrenador${row.entrenadorIds.length !== 1 ? "es" : ""}` : null,
            row.jugadorIds.length ? `${row.jugadorIds.length} jugador${row.jugadorIds.length !== 1 ? "es" : ""}` : null,
          ].filter(Boolean) as string[];
          return (
            <MobileCardRow icon={Users} title={row.nombre} meta={metaParts.join(" · ") || undefined}
              badge={row.categoria ? <Badge variant="secondary" className="text-[11px]">{row.categoria}</Badge> : undefined} />
          );
        }}
      />

      {/* Detail dialog */}
      <EquipoDetailDialog
        equipo={viewing}
        open={detailOpen}
        onOpenChange={(open) => { setDetailOpen(open); if (!open) setViewing(null); }}
        onEdit={openEdit}
        onDelete={openDelete}
      />

      {/* Form dialog */}
      <EquipoForm
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null); }}
        title={editing ? "Editar equipo" : "Nuevo equipo"}
        initialValue={editing}
        loading={editing ? updateLoading : createLoading}
        onSubmit={async (value: EquipoFormValue) => {
          if (!activeWorkspaceId) return;
          const payload = { ...value, workspaceId: activeWorkspaceId };
          if (editing) {
            await updateOne(editing.id, payload);
          } else {
            await createOne(payload);
          }
          setFormOpen(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Eliminar equipo"
        description={`Se eliminará "${deleting?.nombre ?? ""}". Esta acción no se puede deshacer.`}
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
