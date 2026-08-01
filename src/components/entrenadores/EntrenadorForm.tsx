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
import { Textarea } from "@/components/ui/textarea";
import { MultiCheckboxList } from "@/components/shared/MultiCheckboxList";
import { FormField, FormSection } from "@/components/shared/FormField";
import { useSedesLookup } from "@/hooks/useSedesLookup";
import { useEquiposLookup } from "@/hooks/useEquiposLookup";
import { createEntrenadorSchema } from "@/schemas/entrenador.schema";
import type { Entrenador, EntrenadorCreateInput } from "@/types/entrenadores";

export type EntrenadorFormValue = Omit<EntrenadorCreateInput, "workspaceId">;

const entrenadorFormSchema = createEntrenadorSchema.omit({ workspaceId: true });

type EntrenadorFormFields = z.input<typeof entrenadorFormSchema>;

interface EntrenadorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialValue?: Entrenador | null;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (value: EntrenadorFormValue) => Promise<void> | void;
}

export function EntrenadorForm({
  open,
  onOpenChange,
  title,
  initialValue,
  loading = false,
  errorMessage,
  onSubmit,
}: EntrenadorFormProps) {
  const sedesQuery = useSedesLookup();

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<EntrenadorFormFields>({
    resolver: zodResolver(entrenadorFormSchema),
    defaultValues: {
      nombre: "",
      apellidos: "",
      email: "",
      telefono: "",
      fechaNacimiento: "",
      titulacion: "",
      notas: "",
      sedeIds: [],
      equipoIds: [],
    },
  });

  const sedeIds = useWatch({ control, name: "sedeIds" }) ?? [];
  const equiposQuery = useEquiposLookup(sedeIds);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      reset({
        nombre: initialValue?.nombre ?? "",
        apellidos: initialValue?.apellidos ?? "",
        email: initialValue?.email ?? "",
        telefono: initialValue?.telefono ?? "",
        fechaNacimiento: initialValue?.fechaNacimiento ?? "",
        titulacion: initialValue?.titulacion ?? "",
        notas: initialValue?.notas ?? "",
        sedeIds: initialValue?.sedeIds ?? [],
        equipoIds: initialValue?.equipoIds ?? [],
      });
    });
  }, [open, initialValue, reset]);

  const sedeOptions = useMemo(
    () => (sedesQuery.data ?? []).map((s) => ({ id: s.id, label: s.nombre })),
    [sedesQuery.data],
  );
  const equipoOptions = useMemo(
    () => (equiposQuery.data ?? []).map((e) => ({ id: e.id, label: e.nombre })),
    [equiposQuery.data],
  );

  const submit = handleSubmit((values) => {
    onSubmit({
      nombre: values.nombre.trim(),
      apellidos: values.apellidos?.trim() || null,
      email: values.email?.trim() || null,
      telefono: values.telefono?.trim() || null,
      fechaNacimiento: values.fechaNacimiento || null,
      titulacion: values.titulacion?.trim() || null,
      notas: values.notas?.trim() || null,
      sedeIds: values.sedeIds,
      equipoIds: values.equipoIds ?? [],
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex-1 min-w-0">
            <DialogTitle>{title}</DialogTitle>
            {initialValue && (
              <DialogDescription>
                {[initialValue.nombre, initialValue.apellidos].filter(Boolean).join(" ")}
              </DialogDescription>
            )}
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
            <div className="grid grid-cols-2 gap-x-[14px] gap-y-[16px]">
              <FormSection label="Datos personales" />

              <FormField label="Nombre" required error={errors.nombre?.message}>
                <Input autoComplete="off" disabled={loading} {...register("nombre")} />
              </FormField>

              <FormField label="Apellidos" error={errors.apellidos?.message}>
                <Input autoComplete="off" disabled={loading} {...register("apellidos")} />
              </FormField>

              <FormField label="Email" error={errors.email?.message}>
                <Input type="email" autoComplete="off" disabled={loading} {...register("email")} />
              </FormField>

              <FormField label="Teléfono" error={errors.telefono?.message}>
                <Input autoComplete="off" disabled={loading} {...register("telefono")} />
              </FormField>

              <FormField label="Fecha de nacimiento" error={errors.fechaNacimiento?.message}>
                <Input type="date" disabled={loading} {...register("fechaNacimiento")} />
              </FormField>

              <FormField label="Titulación" hint="Ej: UEFA B, Monitor..." error={errors.titulacion?.message}>
                <Input autoComplete="off" placeholder="Ej: UEFA B, Monitor..." disabled={loading} {...register("titulacion")} />
              </FormField>

              <FormField label="Notas" fullWidth error={errors.notas?.message}>
                <Textarea rows={3} disabled={loading} {...register("notas")} />
              </FormField>

              <FormSection label="Sedes" />
              <div className="col-span-2">
                <Controller
                  control={control}
                  name="sedeIds"
                  render={({ field }) => (
                    <MultiCheckboxList
                      options={sedeOptions}
                      value={field.value ?? []}
                      onChange={(next) => {
                        field.onChange(next);
                        setValue(
                          "equipoIds",
                          (getValues("equipoIds") ?? []).filter((eid) => equipoOptions.some((o) => o.id === eid)),
                        );
                      }}
                      disabled={loading || sedesQuery.loading}
                    />
                  )}
                />
                {errors.sedeIds && (
                  <p className="mt-[6px] text-[12px] text-destructive">{errors.sedeIds.message}</p>
                )}
              </div>

              <FormSection label="Equipos" />
              <div className="col-span-2">
                <Controller
                  control={control}
                  name="equipoIds"
                  render={({ field }) => (
                    <MultiCheckboxList
                      options={equipoOptions}
                      value={field.value ?? []}
                      onChange={field.onChange}
                      disabled={loading || equiposQuery.loading}
                      emptyText="Selecciona primero una sede para ver sus equipos."
                    />
                  )}
                />
              </div>
            </div>

            {errorMessage && (
              <p className="mt-[14px] text-[12.5px] text-destructive">{errorMessage}</p>
            )}
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
