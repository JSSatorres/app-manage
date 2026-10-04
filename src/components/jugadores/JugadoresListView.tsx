"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Plus, Pencil, Trash2, User, UserCircle, Shield } from "lucide-react";
import { ColorTag } from "@/components/shared/ColorTag";
import { NameCell } from "@/components/shared/Monogram";
import { RowActionButton, RowActions } from "@/components/shared/RowActionButton";
import { sectionTones } from "@/lib/sectionTones";
import { useJugadores } from "@/hooks/useJugadores";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import { can } from "@/lib/permisos";
import { useSedesLookup } from "@/hooks/useSedesLookup";
import type { Jugador } from "@/types/jugadores";
import { JugadorForm } from "./JugadorForm";
import { JugadorDetailDialog } from "./JugadorDetailDialog";
import { MobileCardRow } from "@/components/shared/MobileCardRow";

// Tamaño de página para la paginación server-side (solo aplica cuando no hay
// filtro de sede activo: ver comentario de `useJugadores`).
const PAGE_SIZE = 10;

export function JugadoresListView() {
  const { activeWorkspaceId, activeSede, rol } = useWorkspaceContext();
  const puedeMutar = can(rol, "jugadores", "mutate");
  const sedesLookup = useSedesLookup();

  // Paginación server-side: solo tiene efecto real cuando no hay sede activa
  // (`useJugadores` cae a `fetchJugadoresByWorkspace` paginado). Con sede
  // activa (caso habitual hoy) la tabla sigue en modo cliente, sin cambios.
  const [page, setPage] = useState(0);

  const {
    data,
    loading,
    errorMessage,
    total,
    createOne,
    updateOne,
    deleteOne,
    createLoading,
    updateLoading,
  } = useJugadores(activeWorkspaceId, activeSede?.id, { page, pageSize: PAGE_SIZE });

  useEffect(() => {
    queueMicrotask(() => setPage(0));
  }, [activeWorkspaceId, activeSede?.id]);

  // Con sede activa, `useJugadores` devuelve la lista completa (sin recortar)
  // y `DataTable` debe seguir paginando en cliente como hasta ahora.
  const serverPaged = !activeSede;

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
        render: (r) => <NameCell name={`${r.nombre} ${r.apellidos ?? ""}`.trim()} />,
      },
      {
        key: "dorsal",
        header: "Dorsal",
        sortable: true,
        accessor: (r) => r.dorsal ?? 0,
        render: (r) =>
          r.dorsal != null ? (
            <span className="inline-grid h-6 min-w-6 place-items-center rounded-md bg-foreground px-1.5 text-[12px] font-semibold tabular-nums text-background">
              {r.dorsal}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        key: "posicion",
        header: "Posición",
        sortable: true,
        accessor: (r) => r.posicion ?? "",
        render: (r) => (r.posicion ? <ColorTag label={r.posicion} /> : <span className="text-muted-foreground">—</span>),
      },
      { key: "telefono", header: "Teléfono", accessor: (r) => r.telefono ?? "", className: "text-muted-foreground tabular-nums" },
      {
        key: "sedes",
        header: "Sedes",
        render: (row) => (
          <div className="flex flex-wrap gap-1">
            {row.sedeIds.map((id) => (
              <ColorTag key={id} label={sedeNameById.get(id) ?? "—"} />
            ))}
          </div>
        ),
      },
      {
        key: "equipos",
        header: "Equipos",
        render: (row) => (
          <span className="inline-flex items-center gap-1.5 tabular-nums text-muted-foreground">
            <Shield className="size-3.5 text-chart-3" aria-hidden="true" />
            {row.equipoIds.length}
          </span>
        ),
      },
    ];
    if (puedeMutar) {
      cols.push({
        key: "acciones",
        header: "Acciones",
        render: (row) => (
          <RowActions>
            <RowActionButton label="Editar" icon={Pencil} onClick={() => openEdit(row)} />
            <RowActionButton label="Eliminar" icon={Trash2} danger onClick={() => openDelete(row)} />
          </RowActions>
        ),
      });
    }
    return cols;
  }, [sedeNameById, puedeMutar]);

  return (
    <div>
      <PageHeader
        title="Jugadores"
        icon={UserCircle}
        tone={sectionTones.jugadores}
        action={
          puedeMutar ? (
            <Button type="button" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="size-4" />Nuevo
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
        pageSize={PAGE_SIZE}
        page={serverPaged ? page : undefined}
        total={serverPaged ? total : undefined}
        onPageChange={serverPaged ? setPage : undefined}
        mobileCard={(row) => {
          const nombre = `${row.nombre} ${row.apellidos ?? ""}`.trim();
          const metaParts = [
            row.posicion,
            row.equipoIds.length ? `${row.equipoIds.length} equipo${row.equipoIds.length !== 1 ? "s" : ""}` : null,
          ].filter(Boolean) as string[];
          return (
            <MobileCardRow icon={User} title={nombre} meta={metaParts.join(" · ") || undefined}
              badge={row.dorsal != null ? <span className="inline-grid h-6 min-w-7 place-items-center rounded-md bg-foreground px-1.5 text-[12px] font-semibold tabular-nums text-background">#{row.dorsal}</span> : undefined} />
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
