"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/shared/FormField";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SedeCloneContentSelector } from "./SedeCloneContentSelector";
import { Loader2, Plus, X, Users } from "lucide-react";
import { useQuery } from "@/hooks/useQuery";
import { fetchEquiposByWorkspace, updateEquipoSede } from "@/services/equipos.service";
import {
  createSedeSchema,
  deriveCloneSedePreflight,
  type CreateSede,
} from "@/schemas/sede.schema";
import type {
  CloneSedeResponse,
  CloneSedeSelection,
  CloneableSedeContent,
  CloneSedeOmission,
  CloneSedeOmissionSummary,
  Sede,
} from "@/types/sedes";
import type { Equipo } from "@/types/equipos";
import { cn } from "@/lib/utils";

interface SedeFormValue {
  nombre: string;
  direccion: string;
}

type SedeFormFields = Omit<CreateSede, "workspace_id" | "responsable_id">;
type PendingClone = {
  value: SedeFormValue;
  selection: CloneSedeSelection;
  omissions: CloneSedeOmission[];
};

const sedeFormSchema = createSedeSchema.omit({ workspace_id: true, responsable_id: true });

const omissionLabels: Record<keyof Omit<CloneSedeOmissionSummary, "total">, string> = {
  entrenador_equipo_no_seleccionado: "relaciones de entrenadores con equipos no clonados",
  jugador_equipo_no_seleccionado: "relaciones de jugadores con equipos no clonados",
  sesion_equipo_no_seleccionado: "sesiones sin equipo seleccionado",
};

interface SedeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialValue?: Sede | null;
  workspaceId?: string;
  sedes?: Sede[];
  isCloneMode?: boolean;
  onCloneModeChange?: (isCloneMode: boolean) => void;
  sourceSedeId?: string | null;
  onSourceSedeIdChange?: (sourceSedeId: string) => void;
  cloneableContent?: CloneableSedeContent | null;
  cloneSelection?: CloneSedeSelection;
  onCloneSelectionChange?: (selection: CloneSedeSelection) => void;
  cloneableContentLoading?: boolean;
  cloneableContentErrorMessage?: string | null;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (value: SedeFormValue) => Promise<void> | void;
  onCloneSubmit?: (
    value: SedeFormValue,
    selection: CloneSedeSelection,
  ) => Promise<CloneSedeResponse | null | undefined> | CloneSedeResponse | null | undefined;
}

export function SedeForm({
  open,
  onOpenChange,
  title,
  initialValue,
  workspaceId,
  sedes = [],
  isCloneMode = false,
  onCloneModeChange,
  sourceSedeId = null,
  onSourceSedeIdChange,
  cloneableContent = null,
  cloneSelection,
  onCloneSelectionChange,
  cloneableContentLoading = false,
  cloneableContentErrorMessage = null,
  loading = false,
  errorMessage,
  onSubmit,
  onCloneSubmit,
}: SedeFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SedeFormFields>({
    resolver: zodResolver(sedeFormSchema),
    defaultValues: { nombre: "", direccion: "" },
  });

  const [equiposVinculados, setEquiposVinculados] = useState<Set<string>>(new Set());
  const [vinculandoId, setVinculandoId] = useState<string | null>(null);
  const [cloneValidationMessage, setCloneValidationMessage] = useState<string | null>(null);
  const [cloneSummary, setCloneSummary] = useState<CloneSedeResponse["resumen"] | null>(null);
  const [cloneOmissions, setCloneOmissions] = useState<CloneSedeResponse["omisiones"] | null>(null);
  const [pendingClone, setPendingClone] = useState<PendingClone | null>(null);

  const isEditing = !!initialValue;

  const { data: todosEquipos, loading: loadingEquipos } = useQuery<Equipo[]>(
    () => open && isEditing && workspaceId
      ? fetchEquiposByWorkspace(workspaceId)
      : Promise.resolve({ data: null, error: null }),
    ["equipos", "sede-form", workspaceId, open, isEditing],
  );

  useEffect(() => {
    if (!open || !initialValue || !todosEquipos) return;
    const vinculados = new Set(
      todosEquipos.filter((e) => e.sedeId === initialValue.id).map((e) => e.id),
    );
    queueMicrotask(() => setEquiposVinculados(vinculados));
  }, [open, initialValue, todosEquipos]);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      reset({
        nombre: initialValue?.nombre ?? "",
        direccion: initialValue?.direccion ?? "",
      });
    });
  }, [open, initialValue, reset]);

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setCloneValidationMessage(null);
        setCloneSummary(null);
        setCloneOmissions(null);
        setPendingClone(null);
      });
    }
  }, [open]);

  async function toggleEquipo(equipo: Equipo) {
    if (!initialValue) return;
    setVinculandoId(equipo.id);
    const yaVinculado = equiposVinculados.has(equipo.id);
    const { error } = await updateEquipoSede(equipo.id, yaVinculado ? null : initialValue.id);
    if (!error) {
      setEquiposVinculados((prev) => {
        const next = new Set(prev);
        if (yaVinculado) next.delete(equipo.id);
        else next.add(equipo.id);
        return next;
      });
    }
    setVinculandoId(null);
  }

  const equiposDeEstaSede = (todosEquipos ?? []).filter((e) => equiposVinculados.has(e.id));
  const equiposSinVincular = (todosEquipos ?? []).filter((e) => !equiposVinculados.has(e.id));

  async function submitClone(value: SedeFormValue, selection: CloneSedeSelection) {
    const response = await onCloneSubmit?.(value, selection);
    if (response) {
      setCloneSummary(response.resumen);
      setCloneOmissions(response.omisiones ?? null);
    }
  }

  const submit = handleSubmit(async (values) => {
    const value = {
      nombre: values.nombre.trim(),
      direccion: (values.direccion ?? "").trim(),
    };

    if (!isCloneMode || isEditing) {
      await onSubmit(value);
      return;
    }

    if (!sourceSedeId) {
      setCloneValidationMessage("Selecciona una sede de origen para clonar su contenido.");
      return;
    }

    const selectedCount = cloneSelection
      ? Object.values(cloneSelection).reduce((total, ids) => total + ids.length, 0)
      : 0;
    if (selectedCount === 0) {
      setCloneValidationMessage("Selecciona al menos un elemento para clonar.");
      return;
    }
    if (!cloneSelection) return;
    if (!cloneableContent) {
      setCloneValidationMessage("No se ha podido preparar el contenido para clonar.");
      return;
    }

    setCloneValidationMessage(null);
    const preflight = deriveCloneSedePreflight(
      cloneableContent,
      cloneSelection,
    );
    if (preflight.omissions.length > 0) {
      setPendingClone({
        value,
        selection: preflight.effectiveSelection,
        omissions: preflight.omissions,
      });
      return;
    }

    await submitClone(value, preflight.effectiveSelection);
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex-1 min-w-0">
            <DialogTitle>{title}</DialogTitle>
            {initialValue && <DialogDescription>{initialValue.nombre}</DialogDescription>}
          </div>
          <DialogClose
            className="ml-auto grid size-9 shrink-0 place-items-center rounded-[10px] bg-secondary text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none"
            aria-label="Cerrar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </DialogClose>
        </DialogHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="min-h-0">
            <div className="flex flex-col gap-[16px]">
              <FormField label="Nombre" required error={errors.nombre?.message}>
                <Input autoComplete="off" disabled={loading} {...register("nombre")} />
              </FormField>

              <FormField label="Dirección" error={errors.direccion?.message}>
                <Input autoComplete="off" disabled={loading} {...register("direccion")} />
              </FormField>

              {!isEditing && workspaceId && cloneSelection && onCloneSelectionChange && (
                <div className="space-y-4 border-t border-border pt-4">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox
                      checked={isCloneMode}
                      aria-label="Clonar contenido de otra sede"
                      disabled={loading}
                      onCheckedChange={(checked) => {
                        setCloneValidationMessage(null);
                        setCloneSummary(null);
                        setCloneOmissions(null);
                        onCloneModeChange?.(checked);
                      }}
                    />
                    Clonar contenido de otra sede
                  </label>

                  {isCloneMode && onSourceSedeIdChange && (
                    <SedeCloneContentSelector
                      workspaceId={workspaceId}
                      sedes={sedes}
                      sourceSedeId={sourceSedeId}
                      content={cloneableContent}
                      selection={cloneSelection}
                      onSourceSedeIdChange={(nextSourceSedeId) => {
                        setCloneValidationMessage(null);
                        setCloneSummary(null);
                        setCloneOmissions(null);
                        onSourceSedeIdChange(nextSourceSedeId);
                      }}
                      onSelectionChange={(nextSelection) => {
                        setCloneValidationMessage(null);
                        setCloneSummary(null);
                        setCloneOmissions(null);
                        onCloneSelectionChange(nextSelection);
                      }}
                      loading={cloneableContentLoading}
                      errorMessage={cloneableContentErrorMessage}
                      disabled={loading}
                    />
                  )}

                  {cloneValidationMessage && (
                    <p role="alert" aria-live="assertive" className="text-sm text-destructive">
                      {cloneValidationMessage}
                    </p>
                  )}

                  {cloneSummary && (
                    <p role="status" aria-live="polite" className="text-sm text-foreground">
                      Sede clonada correctamente: {cloneSummary.equipos} {cloneSummary.equipos === 1 ? "equipo" : "equipos"}, {cloneSummary.entrenadores} {cloneSummary.entrenadores === 1 ? "entrenador" : "entrenadores"}, {cloneSummary.jugadores} {cloneSummary.jugadores === 1 ? "jugador" : "jugadores"}, {cloneSummary.sesiones} {cloneSummary.sesiones === 1 ? "sesión" : "sesiones"}, {cloneSummary.parametros} {cloneSummary.parametros === 1 ? "parámetro" : "parámetros"} y {cloneSummary.documentos} {cloneSummary.documentos === 1 ? "documento" : "documentos"}.
                    </p>
                  )}

                  {cloneOmissions && cloneOmissions.total > 0 && (
                    <p role="status" aria-live="polite" className="text-sm text-foreground">
                      Resumen autoritativo de omisiones: {cloneOmissions.total} {cloneOmissions.total === 1 ? "omisión" : "omisiones"}. {Object.entries(omissionLabels)
                        .filter(([code]) => cloneOmissions[code as keyof typeof omissionLabels] > 0)
                        .map(([code, label]) => `${cloneOmissions[code as keyof typeof omissionLabels]} ${label}`)
                        .join(", ")}.
                    </p>
                  )}
                </div>
              )}

              {isEditing && workspaceId && (
                <div className="pt-[6px]">
                  <div className="flex items-center gap-[8px] mb-[10px]">
                    <Users size={15} className="text-muted-foreground" />
                    <p className="text-[12.5px] font-semibold text-foreground/70">Equipos vinculados</p>
                  </div>

                  {loadingEquipos ? (
                    <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Cargando equipos...
                    </div>
                  ) : (
                    <div className="flex flex-col gap-[10px]">
                      {/* Vinculados */}
                      {equiposDeEstaSede.length > 0 ? (
                        <div className="overflow-hidden rounded-[11px] border border-border">
                          {equiposDeEstaSede.map((eq, idx) => (
                            <div key={eq.id} className={cn("flex items-center justify-between px-[14px] py-[9px]", idx < equiposDeEstaSede.length - 1 && "border-b border-border")}>
                              <div className="min-w-0">
                                <p className="text-[14px] font-medium">{eq.nombre}</p>
                                {eq.categoria && <p className="text-[12px] text-muted-foreground">{eq.categoria}</p>}
                              </div>
                              <button type="button" disabled={vinculandoId === eq.id} onClick={() => toggleEquipo(eq)}
                                className="ml-2 grid size-8 shrink-0 place-items-center rounded-lg text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60">
                                {vinculandoId === eq.id ? <Loader2 className="size-4 animate-spin" /> : <X size={15} />}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[13px] text-muted-foreground italic">Ningún equipo vinculado a esta sede.</p>
                      )}

                      {equiposSinVincular.length > 0 && (
                        <div>
                          <p className="mb-[6px] text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Añadir equipo</p>
                          <div className="overflow-hidden rounded-[11px] border border-border">
                            {equiposSinVincular.map((eq, idx) => (
                              <div key={eq.id} className={cn("flex items-center justify-between px-[14px] py-[9px]", idx < equiposSinVincular.length - 1 && "border-b border-border")}>
                                <div className="min-w-0">
                                  <p className="text-[14px]">{eq.nombre}</p>
                                  {eq.categoria && <p className="text-[12px] text-muted-foreground">{eq.categoria}</p>}
                                </div>
                                <button type="button" disabled={vinculandoId === eq.id} onClick={() => toggleEquipo(eq)}
                                  className="ml-2 grid size-8 shrink-0 place-items-center rounded-lg text-primary transition-colors hover:bg-primary/10 disabled:opacity-60">
                                  {vinculandoId === eq.id ? <Loader2 className="size-4 animate-spin" /> : <Plus size={15} />}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {errorMessage && <p role="alert" aria-live="assertive" className="text-[12.5px] text-destructive">{errorMessage}</p>}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <div className="flex-1" />
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando…" : isCloneMode && !isEditing ? "Clonar sede" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingClone !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingClone(null);
        }}
      >
        <AlertDialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Revisa las omisiones antes de clonar</AlertDialogTitle>
            <AlertDialogDescription>
              Las personas seleccionadas sí se añadirán a la nueva sede. Se omitirán sus relaciones con equipos no clonados y las sesiones cuyo equipo no se haya seleccionado.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-4 space-y-3 text-sm">
            <p className="font-medium">Se omitirán {pendingClone?.omissions.length ?? 0} elementos o relaciones:</p>
            <ul className="space-y-1 text-muted-foreground">
              {Object.entries(omissionLabels).map(([code, label]) => {
                const count = pendingClone?.omissions.filter((omission) => omission.code === code).length ?? 0;
                return count > 0 ? <li key={code}>{count} {label}.</li> : null;
              })}
            </ul>
            <ul className="space-y-2">
              {pendingClone?.omissions.map((omission) => (
                <li key={`${omission.code}-${omission.entityId}-${omission.relatedId}`} className="rounded-none border border-border p-2 text-muted-foreground">
                  {omission.detail}
                </li>
              ))}
            </ul>
          </div>

          <AlertDialogFooter className="flex-col sm:flex-row">
            <AlertDialogCancel autoFocus>Cancelar y revisar</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={async () => {
                if (!pendingClone) return;
                const clone = pendingClone;
                setPendingClone(null);
                await submitClone(clone.value, clone.selection);
              }}
            >
              Continuar de todos modos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
