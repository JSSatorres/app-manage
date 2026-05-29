"use client";

import { useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { useSedesLookup } from "@/hooks/useSedesLookup";
import type { Ejercicio } from "@/types/ejercicios";

interface EjercicioFormValue {
  titulo: string;
  objetivoPrincipal: string;
  numeroJugadoresMin: string;
  esGlobal: boolean;
  sedePropietariaId: string;
}

interface EjercicioFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialValue?: Ejercicio | null;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (value: EjercicioFormValue) => Promise<void> | void;
}

export function EjercicioForm({
  open,
  onOpenChange,
  title,
  initialValue,
  loading = false,
  errorMessage,
  onSubmit,
}: EjercicioFormProps) {
  const sedesQuery = useSedesLookup();

  const defaultValue = useMemo<EjercicioFormValue>(() => ({
    titulo: initialValue?.titulo ?? "",
    objetivoPrincipal: initialValue?.objetivoPrincipal ?? "",
    numeroJugadoresMin: initialValue?.numeroJugadoresMin != null ? String(initialValue.numeroJugadoresMin) : "",
    esGlobal: initialValue?.esGlobal ?? false,
    sedePropietariaId: initialValue?.sedePropietariaId ?? "",
  }), [initialValue]);

  const [titulo, setTitulo] = useState("");
  const [objetivoPrincipal, setObjetivoPrincipal] = useState("");
  const [numeroJugadoresMin, setNumeroJugadoresMin] = useState("");
  const [esGlobal, setEsGlobal] = useState(false);
  const [sedePropietariaId, setSedePropietariaId] = useState("");
  const [touched, setTouched] = useState(false);

  const currentTitulo = open ? defaultValue.titulo : titulo;
  const currentObjetivoPrincipal = open ? defaultValue.objetivoPrincipal : objetivoPrincipal;
  const currentNumeroJugadoresMin = open ? defaultValue.numeroJugadoresMin : numeroJugadoresMin;
  const currentEsGlobal = open ? defaultValue.esGlobal : esGlobal;
  const currentSedePropietariaId = open ? defaultValue.sedePropietariaId : sedePropietariaId;

  const isValid = currentTitulo.trim().length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex-1 min-w-0">
            <DialogTitle>{title}</DialogTitle>
            {initialValue && <DialogDescription>{initialValue.titulo}</DialogDescription>}
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
            <FormField label="Título" required error={touched && currentTitulo.trim().length < 2 ? "Mínimo 2 caracteres." : undefined}>
              <input className={inputClass} value={currentTitulo}
                onChange={(e) => { setTitulo(e.target.value); setTouched(true); }} disabled={loading} />
            </FormField>

            <FormField label="Objetivo principal">
              <input className={inputClass} value={currentObjetivoPrincipal}
                onChange={(e) => setObjetivoPrincipal(e.target.value)} disabled={loading} />
            </FormField>

            <FormField label="Nº jugadores (mín.)">
              <input className={inputClass} inputMode="numeric" value={currentNumeroJugadoresMin}
                onChange={(e) => setNumeroJugadoresMin(e.target.value)} disabled={loading} />
            </FormField>

            {/* Toggle global */}
            <div className="flex items-center justify-between gap-4 rounded-[11px] border border-border bg-secondary/40 px-[14px] py-[11px]">
              <div>
                <p className="text-[14px] font-semibold">Global</p>
                <p className="text-[12.5px] text-muted-foreground mt-0.5">Visible para todas las sedes</p>
              </div>
              <Switch checked={currentEsGlobal} onCheckedChange={(v) => setEsGlobal(!!v)} disabled={loading} />
            </div>

            {!currentEsGlobal && (
              <FormField label="Sede propietaria">
                <select className={inputClass} value={currentSedePropietariaId}
                  onChange={(e) => setSedePropietariaId(e.target.value)}
                  disabled={loading || sedesQuery.loading}>
                  <option value="">Sin sede (global)</option>
                  {(sedesQuery.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </FormField>
            )}

            {(sedesQuery.errorMessage || errorMessage) && (
              <p className="text-[12.5px] text-destructive">{sedesQuery.errorMessage ?? errorMessage}</p>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} disabled={loading}
            className="inline-flex items-center justify-center rounded-[10px] border border-border bg-transparent px-5 py-[11px] text-[13.5px] font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-60">
            Cancelar
          </button>
          <div className="flex-1" />
          <button type="button" disabled={loading || !isValid}
            onClick={() => onSubmit({
              titulo: currentTitulo.trim(), objetivoPrincipal: currentObjetivoPrincipal.trim(),
              numeroJugadoresMin: currentNumeroJugadoresMin.trim(),
              esGlobal: currentEsGlobal, sedePropietariaId: currentSedePropietariaId,
            })}
            className="inline-flex items-center justify-center gap-[7px] rounded-[10px] bg-primary px-5 py-[11px] text-[13.5px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? "Guardando…" : "Guardar cambios"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
