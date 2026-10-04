"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Plus, Pencil, Trash2, Dumbbell, Users, Paperclip, Globe, MapPin } from "lucide-react";
import { ColorTag } from "@/components/shared/ColorTag";
import { RowActionButton, RowActions } from "@/components/shared/RowActionButton";
import { CardStat } from "@/components/shared/MobileCardRow";
import { sectionTones } from "@/lib/sectionTones";
import { useEjercicios } from "@/hooks/useEjercicios";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import { can } from "@/lib/permisos";
import type { Ejercicio } from "@/types/ejercicios";
import { EjercicioForm } from "./EjercicioForm";
import { MobileCardRow } from "@/components/shared/MobileCardRow";
import { Badge } from "@/components/ui/badge";

export function EjerciciosListView() {
  const { activeSede, activeWorkspaceId, rol } = useWorkspaceContext();
  const puedeMutar = can(rol, "ejercicios", "mutate");
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
    documentosErrorMessage,
  } = useEjercicios(activeSede?.id ?? null, activeWorkspaceId);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Ejercicio | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<Ejercicio | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const mutationErrorMessage = editing ? updateErrorMessage : createErrorMessage;

  const columns = useMemo<Column<Ejercicio>[]>(() => {
    const cols: Column<Ejercicio>[] = [
      {
        key: "titulo",
        header: "Título",
        sortable: true,
        accessor: (r) => r.titulo,
        render: (r) => (
          <span className="flex min-w-0 items-center gap-2.5">
            <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-lg bg-chart-6/12 text-chart-6">
              <Dumbbell className="size-3.5" />
            </span>
            <span className="truncate">{r.titulo}</span>
          </span>
        ),
      },
      {
        key: "objetivoPrincipal",
        header: "Objetivo",
        sortable: true,
        accessor: (r) => r.objetivoPrincipal ?? "",
        render: (r) =>
          r.objetivoPrincipal ? <ColorTag label={r.objetivoPrincipal} /> : <span className="text-muted-foreground">—</span>,
      },
      {
        key: "numeroJugadoresMin",
        header: "Jugadores mín.",
        sortable: true,
        accessor: (r) => r.numeroJugadoresMin ?? "",
        render: (r) => (
          <span className="inline-flex items-center gap-1.5 tabular-nums text-muted-foreground">
            <Users className="size-3.5" aria-hidden="true" />
            {r.numeroJugadoresMin ?? "—"}
          </span>
        ),
      },
      {
        key: "documentos",
        header: "Recursos",
        accessor: (r) => r.documentoIds.length,
        render: (r) => (
          <span className="inline-flex items-center gap-1.5 tabular-nums text-muted-foreground">
            <Paperclip className="size-3.5" aria-hidden="true" />
            {r.documentoIds.length}
          </span>
        ),
      },
      {
        key: "esGlobal",
        header: "Global",
        sortable: true,
        accessor: (r) => (r.esGlobal ? "Sí" : "No"),
        render: (r) =>
          r.esGlobal ? (
            <span className="inline-flex h-[22px] items-center gap-1 rounded-md bg-info/10 px-2 text-[11.5px] font-semibold text-info">
              <Globe className="size-3" aria-hidden="true" />Sí
            </span>
          ) : (
            <span className="inline-flex h-[22px] items-center gap-1 rounded-md bg-secondary px-2 text-[11.5px] font-medium text-muted-foreground">
              <MapPin className="size-3" aria-hidden="true" />No
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
            <RowActionButton
              label="Editar"
              icon={Pencil}
              onClick={() => {
                setEditing(row);
                setFormOpen(true);
              }}
            />
            <RowActionButton
              label="Eliminar"
              icon={Trash2}
              danger
              onClick={() => {
                setDeleting(row);
                setConfirmOpen(true);
              }}
            />
          </RowActions>
        ),
      });
    }
    return cols;
  }, [puedeMutar]);

  return (
    <div>
      <PageHeader
        title="Ejercicios"
        icon={Dumbbell}
        tone={sectionTones.ejercicios}
        action={
          puedeMutar ? (
            <Button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              Nuevo
            </Button>
          ) : undefined
        }
      />

      {errorMessage && <p className="mb-4 text-sm text-destructive">{errorMessage}</p>}
      {documentosErrorMessage && (
        <p className="mb-4 text-sm text-destructive">{documentosErrorMessage}</p>
      )}

      <DataTable
        data={data ?? []}
        columns={columns}
        loading={loading}
        rowKey={(r) => r.id}
        emptyTitle="No hay ejercicios"
        emptyDescription="Crea el primer ejercicio."
        onRowClick={puedeMutar ? (row) => {
          setEditing(row);
          setFormOpen(true);
        } : undefined}
        mobileCard={(row) => (
          <MobileCardRow
            icon={Dumbbell}
            title={row.titulo}
            iconColor="var(--chart-6)"
            meta={row.objetivoPrincipal ?? undefined}
            badge={
              row.esGlobal ? (
                <Badge variant="secondary">
                  Global
                </Badge>
              ) : undefined
            }
            stats={
              <>
                <CardStat icon={Users}>{row.numeroJugadoresMin ?? "—"} mín.</CardStat>
                <CardStat icon={Paperclip}>{row.documentoIds.length} recursos</CardStat>
              </>
            }
          />
        )}
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
        errorMessage={
          mutationErrorMessage
            ? `No se pudo guardar el ejercicio: ${mutationErrorMessage}`
            : null
        }
        onSubmit={async (value) => {
          if (!activeWorkspaceId) return;
          const input = { ...value, workspaceId: activeWorkspaceId };
          if (editing) {
            const updated = await updateOne(editing.id, input);
            if (updated) {
              setFormOpen(false);
              setEditing(null);
            }
            return;
          }

          const created = await createOne(input);
          if (created) setFormOpen(false);
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
