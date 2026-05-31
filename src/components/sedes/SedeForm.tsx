"use client";

import { useEffect, useMemo, useState } from "react";
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
import { FormField, inputClass } from "@/components/shared/FormField";
import { Loader2, Plus, X, Users } from "lucide-react";
import { useQuery } from "@/hooks/useQuery";
import { fetchEquiposByWorkspace, updateEquipoSede } from "@/services/equipos.service";
import type { Sede } from "@/types/sedes";
import type { Equipo } from "@/types/equipos";
import { cn } from "@/lib/utils";

interface SedeFormValue {
  nombre: string;
  direccion: string;
}

interface SedeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialValue?: Sede | null;
  workspaceId?: string;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (value: SedeFormValue) => Promise<void> | void;
}

export function SedeForm({
  open,
  onOpenChange,
  title,
  initialValue,
  workspaceId,
  loading = false,
  errorMessage,
  onSubmit,
}: SedeFormProps) {
  const defaultValue = useMemo<SedeFormValue>(() => ({
    nombre: initialValue?.nombre ?? "",
    direccion: initialValue?.direccion ?? "",
  }), [initialValue]);

  const [nombre, setNombre] = useState(defaultValue.nombre);
  const [direccion, setDireccion] = useState(defaultValue.direccion);
  const [touched, setTouched] = useState(false);
  const [equiposVinculados, setEquiposVinculados] = useState<Set<string>>(new Set());
  const [vinculandoId, setVinculandoId] = useState<string | null>(null);

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
      setNombre(defaultValue.nombre);
      setDireccion(defaultValue.direccion);
      setTouched(false);
    });
  }, [open, defaultValue]);

  const isValid = nombre.trim().length >= 2;

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

  return (
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

        <DialogBody>
          <div className="flex flex-col gap-[16px]">
            <FormField label="Nombre" required error={touched && !isValid ? "Mínimo 2 caracteres." : undefined}>
              <input className={inputClass} value={nombre}
                onChange={(e) => { setNombre(e.target.value); setTouched(true); }} disabled={loading} />
            </FormField>

            <FormField label="Dirección">
              <input className={inputClass} value={direccion}
                onChange={(e) => setDireccion(e.target.value)} disabled={loading} />
            </FormField>

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

            {errorMessage && <p className="text-[12.5px] text-destructive">{errorMessage}</p>}
          </div>
        </DialogBody>

        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} disabled={loading}
            className="inline-flex items-center justify-center rounded-[10px] border border-border bg-transparent px-5 py-[11px] text-[13.5px] font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-60">
            Cancelar
          </button>
          <div className="flex-1" />
          <button type="button" disabled={loading || !isValid}
            onClick={() => onSubmit({ nombre: nombre.trim(), direccion: direccion.trim() })}
            className="inline-flex items-center justify-center gap-[7px] rounded-[10px] bg-primary px-5 py-[11px] text-[13.5px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? "Guardando…" : "Guardar cambios"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
