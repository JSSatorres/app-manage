"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Plus, Pencil, Trash2, User } from "lucide-react";
import { useJugadores } from "@/hooks/useJugadores";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import { can } from "@/lib/permisos";
import { useSedesLookup } from "@/hooks/useSedesLookup";
import type { Jugador } from "@/types/jugadores";
import { JugadorForm } from "./JugadorForm";
import { JugadorDetailDialog } from "./JugadorDetailDialog";
import { MobileCardRow } from "@/components/shared/MobileCardRow";

export function JugadoresListView() {
  const { activeWorkspaceId, activeSede, rol } = useWorkspaceContext();
  const puedeMutar = can(rol, "jugadores", "mutate");
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
  } = useJugadores(activeWorkspaceId, activeSede?.id);

  // Detail (vista)
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewing, setViewing] = useState<Jugador | null>(null);

  // Form (edición)
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Jugador | null>(null);

  // Confirm (eliminar)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<Jugador | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const sedeNameById = useMemo(() => {
    const map = new Map<string, string>();
    (sedesLookup.data ?? []).forEach((s) => map.set(s.id, s.nombre));
    return map;
  }, [sedesLookup.data]);

  function openDetail(row: Jugador) {
    setViewing(row);
    setDetailOpen(true);
  }

  function openEdit(row: Jugador) {
    setEditing(row);
    setFormOpen(true);
  }

  function openDelete(row: Jugador) {
    setDeleting(row);
    setConfirmOpen(true);
  }

  const columns = useMemo<Column<Jugador>[]>(() => {
    const cols: Column<Jugador>[] = [
      {
        key: "nombre",
        header: "Nombre",
        sortable: true,
        accessor: (r) => `${r.nombre} ${r.apellidos ?? ""}`.trim(),
      },
      { key: "dorsal", header: "Dorsal", sortable: true, accessor: (r) => r.dorsal ?? 0 },
      { key: "posicion", header: "Posición", sortable: true, accessor: (r) => r.posicion ?? "" },
      { key: "telefono", header: "Teléfono", accessor: (r) => r.telefono ?? "" },
      {
        key: "sedes",
        header: "Sedes",
        render: (row) => (
          <div className="flex flex-wrap gap-1">
            {row.sedeIds.map((id) => (
              <Badge key={id} variant="secondary" className="text-xs">{sedeNameById.get(id) ?? "—"}</Badge>
            ))}
          </div>
        ),
      },
      {
        key: "equipos",
        header: "Equipos",
        render: (row) => <span className="text-sm text-muted-foreground">{row.equipoIds.length}</span>,
      },
    ];
    if (puedeMutar) {
      cols.push({
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
      });
    }
    return cols;
  }, [sedeNameById, puedeMutar]);

  return (
    <div>
      <PageHeader
        title="Jugadores"
        action={
          puedeMutar ? (
            <Button type="button" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="mr-2 size-4" />Nuevo
            </Button>
          ) : undefined
        }
      />

      {errorMessage && <p className="mb-4 text-sm text-destructive">{errorMessage}</p>}

      <DataTable
        data={data ?? []}
        columns={columns}
        loading={loading}
        rowKey={(r) => r.id}
        emptyTitle="No hay jugadores"
        emptyDescription="Crea el primer jugador."
        onRowClick={openDetail}
        mobileCard={(row) => {
          const nombre = `${row.nombre} ${row.apellidos ?? ""}`.trim();
          const metaParts = [
            row.posicion,
            row.equipoIds.length ? `${row.equipoIds.length} equipo${row.equipoIds.length !== 1 ? "s" : ""}` : null,
          ].filter(Boolean) as string[];
          return (
            <MobileCardRow icon={User} title={nombre} meta={metaParts.join(" · ") || undefined}
              badge={row.dorsal != null ? <Badge variant="secondary" className="text-[11px]">#{row.dorsal}</Badge> : undefined} />
          );
        }}
      />

      {/* Detail dialog */}
      <JugadorDetailDialog
        jugador={viewing}
        open={detailOpen}
        onOpenChange={(open) => { setDetailOpen(open); if (!open) setViewing(null); }}
        onEdit={openEdit}
        onDelete={openDelete}
      />

      {/* Form dialog */}
      <JugadorForm
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null); }}
        title={editing ? "Editar jugador" : "Nuevo jugador"}
        initialValue={editing}
        loading={editing ? updateLoading : createLoading}
        onSubmit={async (value) => {
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
        title="Eliminar jugador"
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
