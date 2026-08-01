"use client";

import { useEffect } from "react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormField } from "@/components/shared/FormField";
import { createParametroSchema } from "@/schemas/parametro.schema";
import type { ParametroSistema } from "@/types/parametros";

// El form solo gestiona `nombre`/`activo`: `categoria`/`sedeId` los inyecta el
// consumidor (categoría activa de la pestaña, sede del parámetro que se edita).
const parametroFormSchema = createParametroSchema.pick({ nombre: true, activo: true });

type ParametroFormFields = z.input<typeof parametroFormSchema>;

export type ParametroFormValue = z.infer<typeof parametroFormSchema>;

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
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ParametroFormFields>({
    resolver: zodResolver(parametroFormSchema),
    defaultValues: {
      nombre: "",
      activo: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      reset({
        nombre: initialValue?.nombre ?? "",
        activo: initialValue?.activo ?? true,
      });
    });
  }, [open, initialValue, reset]);

  const submit = handleSubmit((values) => {
    onSubmit({ nombre: values.nombre.trim(), activo: values.activo });
  });

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

        <form onSubmit={submit}>
          <DialogBody>
            <div className="flex flex-col gap-[16px]">
              <FormField label="Nombre" required error={errors.nombre?.message}>
                <Input autoComplete="off" placeholder="Ej: Material" disabled={loading} {...register("nombre")} />
              </FormField>

              <div className="flex items-center justify-between rounded-[11px] border border-border bg-secondary/40 px-[14px] py-[11px]">
                <div>
                  <p className="text-[14px] font-semibold">Activo</p>
                  <p className="text-[12.5px] text-muted-foreground mt-0.5">Disponible en formularios y filtros</p>
                </div>
                <Controller
                  control={control}
                  name="activo"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={loading} />
                  )}
                />
              </div>

              {errorMessage && <p className="text-[12.5px] text-destructive">{errorMessage}</p>}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <div className="flex-1" />
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando…" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
