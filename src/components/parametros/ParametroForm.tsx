"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { FormField, inputClass } from "@/components/shared/FormField";
import { Switch } from "@/components/ui/switch";
import type { ParametroSistema } from "@/types/parametros";

interface ParametroFormValue {
  nombre: string;
  activo: boolean;
}

interface ParametroFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialValue?: ParametroSistema | null;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (value: ParametroFormValue) => Promise<void> | void;
}

export function ParametroForm({
  open,
  onOpenChange,
  title,
  initialValue,
  loading = false,
  errorMessage,
  onSubmit,
}: ParametroFormProps) {
  const defaultValue = useMemo<ParametroFormValue>(() => ({
    nombre: initialValue?.nombre ?? "",
    activo: initialValue?.activo ?? true,
  }), [initialValue]);

  const [nombre, setNombre] = useState(defaultValue.nombre);
  const [activo, setActivo] = useState(defaultValue.activo);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setNombre(defaultValue.nombre);
      setActivo(defaultValue.activo);
      setTouched(false);
    });
  }, [open, defaultValue]);

  const isValid = nombre.trim().length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex-1 min-w-0">
            <DialogTitle>{title}</DialogTitle>
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
              <input className={inputClass} value={nombre} placeholder="Ej: Material"
                onChange={(e) => { setNombre(e.target.value); setTouched(true); }} disabled={loading} />
            </FormField>

            <div className="flex items-center justify-between rounded-[11px] border border-border bg-secondary/40 px-[14px] py-[11px]">
              <div>
                <p className="text-[14px] font-semibold">Activo</p>
                <p className="text-[12.5px] text-muted-foreground mt-0.5">Disponible en formularios y filtros</p>
              </div>
              <Switch checked={activo} onCheckedChange={setActivo} disabled={loading} />
            </div>

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
            onClick={() => onSubmit({ nombre: nombre.trim(), activo })}
            className="inline-flex items-center justify-center gap-[7px] rounded-[10px] bg-primary px-5 py-[11px] text-[13.5px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? "Guardando…" : "Guardar cambios"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
