"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { RowActionButton, RowActions } from "@/components/shared/RowActionButton";
import { sectionTones } from "@/lib/sectionTones";
import { useSedes } from "@/hooks/useSedes";
import { useEquipos } from "@/hooks/useEquipos";
import { useEntrenadores } from "@/hooks/useEntrenadores";
import { useJugadores } from "@/hooks/useJugadores";
import { useSesiones } from "@/hooks/useSesiones";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import { can } from "@/lib/permisos";
import type { CloneSedeSelection, Sede } from "@/types/sedes";
import type { Equipo, EquipoUpdateInput } from "@/types/equipos";
import type { Entrenador } from "@/types/entrenadores";
import type { Jugador } from "@/types/jugadores";
import type { Sesion } from "@/types/sesiones";
import type { EstadoSesion, PeriodoTemporada } from "@/lib/constants";
import { SedeForm } from "./SedeForm";
import { SedeAccordionRow } from "./SedeAccordionRow";
import { EquipoForm, type EquipoFormValue } from "@/components/equipos/EquipoForm";
import { EntrenadorForm, type EntrenadorFormValue } from "@/components/entrenadores/EntrenadorForm";
import { JugadorForm, type JugadorFormValue } from "@/components/jugadores/JugadorForm";
import { SesionForm } from "@/components/sesiones/SesionForm";

const emptyCloneSelection: CloneSedeSelection = {
  equipos: [],
  entrenadores: [],
  jugadores: [],
  sesiones: [],
  parametros: [],
  documentos: [],
};

export function SedesListView() {
  const { refresh, activeWorkspace, rol } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? null;
  const puedeMutar = can(rol, "sedes", "mutate");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Sede | null>(null);
  const [isCloneMode, setIsCloneMode] = useState(false);
  const [sourceSedeId, setSourceSedeId] = useState<string | null>(null);
  const [cloneSelection, setCloneSelection] = useState<CloneSedeSelection>(emptyCloneSelection);

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
    cloneOne,
    cloneLoading,
    cloneErrorMessage,
    cloneableContent,
    cloneableContentLoading,
    cloneableContentErrorMessage,
    refetch,
  } = useSedes(workspaceId, {
    isCloneMode: formOpen && !editing && isCloneMode,
    sourceSedeId,
  });

  const equiposMutations = useEquipos(workspaceId);
  const entrenadorMutations = useEntrenadores(workspaceId);
  const jugadorMutations = useJugadores(workspaceId);
  const { updateOne: updateSesion, updateLoading: sesionUpdateLoading, updateErrorMessage: sesionUpdateError } =
    useSesiones(activeWorkspace?.sedes?.map((s: { id: string }) => s.id) ?? []);

  const runMutations = async (fn: () => Promise<unknown>) => {
    await fn();
    await refetch();
    await refresh();
  };

  // Estado modal sede
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<Sede | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  function resetCloneState() {
    setIsCloneMode(false);
    setSourceSedeId(null);
    setCloneSelection(emptyCloneSelection);
  }

  // Estado modal equipo
  const [equipoFormOpen, setEquipoFormOpen] = useState(false);
  const [editingEquipo, setEditingEquipo] = useState<Equipo | null>(null);

  // Estado modal entrenador
  const [entrenadorFormOpen, setEntrenadorFormOpen] = useState(false);
  const [editingEntrenador, setEditingEntrenador] = useState<Entrenador | null>(null);

  // Estado modal jugador
  const [jugadorFormOpen, setJugadorFormOpen] = useState(false);
  const [editingJugador, setEditingJugador] = useState<Jugador | null>(null);

  // Estado modal sesión
  const [sesionFormOpen, setSesionFormOpen] = useState(false);
  const [editingSesion, setEditingSesion] = useState<Sesion | null>(null);

  function renderActions(row: Sede) {
    if (!puedeMutar) return null;
    return (
      <RowActions>
        <RowActionButton
          label={`Editar sede ${row.nombre}`}
          icon={Pencil}
          onClick={() => {
            setEditing(row);
            resetCloneState();
            setFormOpen(true);
          }}
        />
        <RowActionButton
          label={`Eliminar sede ${row.nombre}`}
          icon={Trash2}
          danger
          onClick={() => {
            setDeleting(row);
            setConfirmOpen(true);
          }}
        />
      </RowActions>
    );
  }

  return (
    <div>
      <PageHeader
        title="Sedes"
        icon={Building2}
        tone={sectionTones.sedes}
        action={
          puedeMutar ? (
            <Button
              type="button"
              aria-label="Nueva sede"
              onClick={() => {
                setEditing(null);
                resetCloneState();
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              Nueva
            </Button>
          ) : undefined
        }
      />

      {errorMessage && <p className="mb-4 text-sm text-destructive">{errorMessage}</p>}

      <section
        aria-label="Listado de sedes"
        className="flex flex-col gap-2 text-foreground"
      >
        {loading ? (
          <p role="status" className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground shadow-card">
            Cargando sedes...
          </p>
        ) : (data ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/60 px-4 py-10 text-center">
            <p className="text-sm font-medium">No hay sedes</p>
            <p className="text-sm text-muted-foreground">Crea la primera sede para empezar.</p>
          </div>
        ) : (
          (data ?? []).map((sede) => (
            <SedeAccordionRow
              key={sede.id}
              sede={sede}
              actions={renderActions(sede)}
              onEditEquipo={(eq) => { setEditingEquipo(eq); setEquipoFormOpen(true); }}
              onEditEntrenador={(e) => { setEditingEntrenador(e); setEntrenadorFormOpen(true); }}
              onEditJugador={(j) => { setEditingJugador(j); setJugadorFormOpen(true); }}
              onEditSesion={(s) => { setEditingSesion(s); setSesionFormOpen(true); }}
            />
          ))
        )}
      </section>

      {/* Modal edición sede */}
      <SedeForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditing(null);
            setFormErrorMessage(null);
            resetCloneState();
          }
        }}
        title={editing ? "Editar sede" : "Nueva sede"}
        initialValue={editing}
        workspaceId={activeWorkspace?.id}
        sedes={data ?? []}
        isCloneMode={isCloneMode}
        onCloneModeChange={(enabled) => {
          setIsCloneMode(enabled);
          setFormErrorMessage(null);
          if (!enabled) {
            setSourceSedeId(null);
            setCloneSelection(emptyCloneSelection);
          }
        }}
        sourceSedeId={sourceSedeId}
        onSourceSedeIdChange={(nextSourceSedeId) => {
          setSourceSedeId(nextSourceSedeId || null);
          setCloneSelection(emptyCloneSelection);
        }}
        cloneableContent={cloneableContent}
        cloneSelection={cloneSelection}
        onCloneSelectionChange={setCloneSelection}
        cloneableContentLoading={cloneableContentLoading}
        cloneableContentErrorMessage={cloneableContentErrorMessage}
        loading={editing ? updateLoading : isCloneMode ? cloneLoading : createLoading}
        errorMessage={formErrorMessage ?? (editing ? updateErrorMessage : isCloneMode ? cloneErrorMessage : createErrorMessage)}
        onSubmit={async (value) => {
          setFormErrorMessage(null);
          try {
            if (editing) {
              await runMutations(async () =>
                updateOne(editing.id, {
                  nombre: value.nombre,
                  direccion: value.direccion || null,
                }),
              );
            } else {
              await runMutations(async () =>
                createOne({
                  nombre: value.nombre,
                  direccion: value.direccion || null,
                  workspaceId: workspaceId ?? "",
                }),
              );
            }
            setFormOpen(false);
            setEditing(null);
            resetCloneState();
          } catch {
            // Error ya manejado por useMutation, no cerrar el dialog
          }
        }}
        onCloneSubmit={async (value, selection) => {
          if (!workspaceId || !sourceSedeId) return null;
          setFormErrorMessage(null);
          try {
            const cloned = await cloneOne({
              workspaceId,
              sourceSedeId,
              nombre: value.nombre,
              direccion: value.direccion || null,
              seleccion: selection,
            });
            return cloned;
          } catch {
            return null;
          }
        }}
      />

      {/* Modal edición equipo */}
      <EquipoForm
        open={equipoFormOpen}
        onOpenChange={(open) => {
          setEquipoFormOpen(open);
          if (!open) setEditingEquipo(null);
        }}
        title="Editar equipo"
        initialValue={editingEquipo}
        loading={equiposMutations.updateLoading}
        errorMessage={equiposMutations.updateErrorMessage}
        onSubmit={async (value: EquipoFormValue) => {
          if (!workspaceId || !editingEquipo) return;
          const payload: EquipoUpdateInput = { ...value, workspaceId };
          await equiposMutations.updateOne(editingEquipo.id, payload);
          setEquipoFormOpen(false);
          setEditingEquipo(null);
        }}
      />

      {/* Modal edición entrenador */}
      <EntrenadorForm
        open={entrenadorFormOpen}
        onOpenChange={(open) => {
          setEntrenadorFormOpen(open);
          if (!open) setEditingEntrenador(null);
        }}
        title="Editar entrenador"
        initialValue={editingEntrenador}
        loading={entrenadorMutations.updateLoading}
        errorMessage={entrenadorMutations.updateErrorMessage}
        onSubmit={async (value: EntrenadorFormValue) => {
          if (!workspaceId || !editingEntrenador) return;
          await entrenadorMutations.updateOne(editingEntrenador.id, { ...value, workspaceId });
          setEntrenadorFormOpen(false);
          setEditingEntrenador(null);
        }}
      />

      {/* Modal edición jugador */}
      <JugadorForm
        open={jugadorFormOpen}
        onOpenChange={(open) => {
          setJugadorFormOpen(open);
          if (!open) setEditingJugador(null);
        }}
        title="Editar jugador"
        initialValue={editingJugador}
        loading={jugadorMutations.updateLoading}
        errorMessage={jugadorMutations.updateErrorMessage}
        onSubmit={async (value: JugadorFormValue) => {
          if (!workspaceId || !editingJugador) return;
          await jugadorMutations.updateOne(editingJugador.id, { ...value, workspaceId });
          setJugadorFormOpen(false);
          setEditingJugador(null);
        }}
      />

      {/* Modal edición sesión */}
      <SesionForm
        open={sesionFormOpen}
        onOpenChange={(open) => {
          setSesionFormOpen(open);
          if (!open) setEditingSesion(null);
        }}
        title="Editar sesión"
        sedeIds={activeWorkspace?.sedes?.map((s: { id: string }) => s.id) ?? []}
        workspaceId={workspaceId}
        initialValue={editingSesion}
        loading={sesionUpdateLoading}
        errorMessage={sesionUpdateError}
        onSubmit={async (value) => {
          if (!editingSesion) return null;
          const duracion = value.duracionEstimada ? Number(value.duracionEstimada) : null;
          return updateSesion(editingSesion.id, {
            fecha: value.fecha,
            horaInicio: value.horaInicio || null,
            duracionEstimada: Number.isFinite(duracion as number) ? duracion : null,
            equipoId: value.equipoId,
            entrenadorIds: value.entrenadorIds,
            microciclo: null,
            periodoTemporada: value.periodoTemporada ? (value.periodoTemporada as PeriodoTemporada) : null,
            objetivoSesion: value.objetivoSesion || null,
            observacionesPrevias: value.observacionesPrevias || null,
            estado: value.estado as EstadoSesion,
            feedbackPostEntreno: editingSesion.feedbackPostEntreno,
          });
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Eliminar sede"
        description={`Se eliminará "${deleting?.nombre ?? ""}". Esto puede borrar datos asociados. Esta acción no se puede deshacer.`}
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
