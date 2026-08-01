"use client";

import { useEffect, useMemo } from "react";
import { z } from "zod";
import { useForm, Controller, useWatch } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiCheckboxList } from "@/components/shared/MultiCheckboxList";
import { FormField, FormSection } from "@/components/shared/FormField";
import { useSedesLookup } from "@/hooks/useSedesLookup";
import { useEntrenadoresLookup } from "@/hooks/useEntrenadoresLookup";
import { useJugadoresLookup } from "@/hooks/useJugadoresLookup";
import { createEquipoSchema } from "@/schemas/equipo.schema";
import type { Equipo, EquipoCreateInput } from "@/types/equipos";

export type EquipoFormValue = Omit<EquipoCreateInput, "workspaceId">;

const equipoFormSchema = createEquipoSchema;

type EquipoFormFields = z.input<typeof equipoFormSchema>;

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

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<EquipoFormFields>({
    resolver: zodResolver(equipoFormSchema),
    defaultValues: {
      nombre: "",
      categoria: "",
      sedeId: "",
      entrenadorIds: [],
      jugadorIds: [],
    },
  });

  const sedeId = useWatch({ control, name: "sedeId" });
  const entrenadoresQuery = useEntrenadoresLookup(sedeId || null);
  const jugadoresQuery = useJugadoresLookup(sedeId || null);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      reset({
        nombre: initialValue?.nombre ?? "",
        categoria: initialValue?.categoria ?? "",
        sedeId: initialValue?.sedeId ?? "",
        entrenadorIds: initialValue?.entrenadorIds ?? [],
        jugadorIds: initialValue?.jugadorIds ?? [],
      });
    });
  }, [open, initialValue, reset]);

  const sedeOptions = useMemo(
    () => (sedesQuery.data ?? []).map((s) => ({ value: s.id, label: s.nombre })),
    [sedesQuery.data],
  );

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

  const submit = handleSubmit((values) => {
    onSubmit({
      nombre: values.nombre.trim(),
      categoria: values.categoria?.trim() || null,
      sedeId: values.sedeId,
      entrenadorIds: values.entrenadorIds ?? [],
      jugadorIds: values.jugadorIds ?? [],
    });
  });

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
        <form onSubmit={submit}>
          <DialogBody>
            <div className="grid grid-cols-2 gap-x-[14px] gap-y-[16px]">
              <FormField label="Nombre" required error={errors.nombre?.message}>
                <Input autoComplete="off" disabled={loading} {...register("nombre")} />
              </FormField>

              <FormField label="Categoría" hint="Ej: B1, Sub-16, Absoluto..." error={errors.categoria?.message}>
                <Input autoComplete="off" placeholder="Ej: Cadete, Juvenil..." disabled={loading} {...register("categoria")} />
              </FormField>

              <FormField label="Sede" required fullWidth error={errors.sedeId?.message}>
                <Controller
                  control={control}
                  name="sedeId"
                  render={({ field }) => (
                    <Select
                      items={sedeOptions}
                      value={field.value || null}
                      onValueChange={(v) => {
                        field.onChange(v ?? "");
                        setValue("entrenadorIds", []);
                        setValue("jugadorIds", []);
                      }}
                      disabled={loading || sedesQuery.loading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona una sede" />
                      </SelectTrigger>
                      <SelectContent>
                        {sedeOptions.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormSection label="Entrenadores" />
              <div className="col-span-2">
                <Controller
                  control={control}
                  name="entrenadorIds"
                  render={({ field }) => (
                    <MultiCheckboxList
                      options={entrenadorOptions}
                      value={field.value ?? []}
                      onChange={field.onChange}
                      disabled={loading || entrenadoresQuery.loading || !sedeId}
                      emptyText={sedeId ? "No hay entrenadores en esta sede." : "Selecciona primero una sede."}
                    />
                  )}
                />
              </div>

              <FormSection label="Jugadores" />
              <div className="col-span-2">
                <Controller
                  control={control}
                  name="jugadorIds"
                  render={({ field }) => (
                    <MultiCheckboxList
                      options={jugadorOptions}
                      value={field.value ?? []}
                      onChange={field.onChange}
                      disabled={loading || jugadoresQuery.loading || !sedeId}
                      emptyText={sedeId ? "No hay jugadores en esta sede." : "Selecciona primero una sede."}
                    />
                  )}
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
