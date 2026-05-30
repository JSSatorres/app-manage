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
import { MultiCheckboxList } from "@/components/shared/MultiCheckboxList";
import { FormField, FormSection, inputClass } from "@/components/shared/FormField";
import { useSedesLookup } from "@/hooks/useSedesLookup";
import { useEntrenadoresLookup } from "@/hooks/useEntrenadoresLookup";
import { useJugadoresLookup } from "@/hooks/useJugadoresLookup";
import type { Equipo, EquipoCreateInput } from "@/types/equipos";

export type EquipoFormValue = Omit<EquipoCreateInput, "workspaceId">;

interface EquipoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialValue?: Equipo | null;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (value: EquipoFormValue) => Promise<void> | void;
}

export function EquipoForm({
  open,
  onOpenChange,
  title,
  initialValue,
  loading = false,
  errorMessage,
  onSubmit,
}: EquipoFormProps) {
  const sedesQuery = useSedesLookup();

  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [sedeId, setSedeId] = useState("");
  const [entrenadorIds, setEntrenadorIds] = useState<string[]>([]);
  const [jugadorIds, setJugadorIds] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);

  const entrenadoresQuery = useEntrenadoresLookup(sedeId || null);
  const jugadoresQuery = useJugadoresLookup(sedeId || null);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setNombre(initialValue?.nombre ?? "");
      setCategoria(initialValue?.categoria ?? "");
      setSedeId(initialValue?.sedeId ?? "");
      setEntrenadorIds(initialValue?.entrenadorIds ?? []);
      setJugadorIds(initialValue?.jugadorIds ?? []);
      setTouched(false);
    });
  }, [open, initialValue]);

  useEffect(() => {
    const entOptions = (entrenadoresQuery.data ?? []).map((e) => e.id);
    const jugOptions = (jugadoresQuery.data ?? []).map((j) => j.id);
    setEntrenadorIds((prev) => prev.filter((id) => entOptions.includes(id)));
    setJugadorIds((prev) => prev.filter((id) => jugOptions.includes(id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sedeId]);

  const entrenadorOptions = useMemo(
    () => (entrenadoresQuery.data ?? []).map((e) => ({
      id: e.id,
      label: [e.nombre, e.apellidos].filter(Boolean).join(" "),
    })),
    [entrenadoresQuery.data],
  );

  const jugadorOptions = useMemo(
    () => (jugadoresQuery.data ?? []).map((j) => ({
      id: j.id,
      label: [j.dorsal != null ? `#${j.dorsal}` : null, j.nombre, j.apellidos].filter(Boolean).join(" "),
    })),
    [jugadoresQuery.data],
  );

  const isValid = nombre.trim().length >= 2 && !!sedeId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Cabecera */}
        <DialogHeader>
          <div className="flex-1 min-w-0">
            <DialogTitle>{title}</DialogTitle>
            {initialValue && (
              <DialogDescription>{initialValue.nombre}</DialogDescription>
            )}
          </div>
          <DialogClose
            className="ml-auto grid size-9 shrink-0 place-items-center rounded-[10px] bg-secondary text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none"
            aria-label="Cerrar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </DialogClose>
        </DialogHeader>

        {/* Cuerpo */}
        <DialogBody>
          <div className="grid grid-cols-2 gap-x-[14px] gap-y-[16px]">
            <FormField label="Nombre" required error={touched && nombre.trim().length < 2 ? "Mínimo 2 caracteres." : undefined}>
              <input
                className={inputClass}
                autoComplete="off"
                value={nombre}
                onChange={(e) => { setNombre(e.target.value); setTouched(true); }}
                disabled={loading}
              />
            </FormField>

            <FormField label="Categoría" hint="Ej: B1, Sub-16, Absoluto...">
              <input
                className={inputClass}
                autoComplete="off"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                disabled={loading}
                placeholder="Ej: Cadete, Juvenil..."
              />
            </FormField>

            <FormField label="Sede" required fullWidth error={touched && !sedeId ? "Selecciona una sede." : undefined}>
              <select
                className={inputClass}
                value={sedeId}
                onChange={(e) => { setSedeId(e.target.value); setTouched(true); }}
                disabled={loading || sedesQuery.loading}
              >
                <option value="">Selecciona una sede</option>
                {(sedesQuery.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </FormField>

            <FormSection label="Entrenadores" />
            <div className="col-span-2">
              <MultiCheckboxList
                options={entrenadorOptions}
                value={entrenadorIds}
                onChange={setEntrenadorIds}
                disabled={loading || entrenadoresQuery.loading || !sedeId}
                emptyText={sedeId ? "No hay entrenadores en esta sede." : "Selecciona primero una sede."}
              />
            </div>

            <FormSection label="Jugadores" />
            <div className="col-span-2">
              <MultiCheckboxList
                options={jugadorOptions}
                value={jugadorIds}
                onChange={setJugadorIds}
                disabled={loading || jugadoresQuery.loading || !sedeId}
                emptyText={sedeId ? "No hay jugadores en esta sede." : "Selecciona primero una sede."}
              />
            </div>
          </div>

          {(sedesQuery.errorMessage || errorMessage) && (
            <p className="mt-[14px] text-[12.5px] text-destructive">
              {sedesQuery.errorMessage ?? errorMessage}
            </p>
          )}
        </DialogBody>

        {/* Pie */}
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-[10px] border border-border bg-transparent px-5 py-[11px] text-[13.5px] font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
          >
            Cancelar
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => onSubmit({
              nombre: nombre.trim(),
              categoria: categoria.trim() || null,
              sedeId,
              entrenadorIds,
              jugadorIds,
            })}
            disabled={loading || !isValid}
            className="inline-flex items-center justify-center gap-[7px] rounded-[10px] bg-primary px-5 py-[11px] text-[13.5px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Guardando…" : "Guardar cambios"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
