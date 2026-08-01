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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiCheckboxList } from "@/components/shared/MultiCheckboxList";
import { FormField, FormSection } from "@/components/shared/FormField";
import { useSedesLookup } from "@/hooks/useSedesLookup";
import { useEquiposLookup } from "@/hooks/useEquiposLookup";
import { createJugadorSchema } from "@/schemas/jugador.schema";
import type { Jugador, JugadorCreateInput, PieDominante } from "@/types/jugadores";

export type JugadorFormValue = Omit<JugadorCreateInput, "workspaceId">;

const jugadorFormSchema = createJugadorSchema.omit({ workspaceId: true });

type JugadorFormFields = z.input<typeof jugadorFormSchema>;

const PIE_DOMINANTE_OPTIONS: { value: PieDominante; label: string }[] = [
  { value: "Diestro", label: "Diestro" },
  { value: "Zurdo", label: "Zurdo" },
  { value: "Ambidiestro", label: "Ambidiestro" },
];

interface JugadorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialValue?: Jugador | null;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (value: JugadorFormValue) => Promise<void> | void;
}

export function JugadorForm({
  open,
  onOpenChange,
  title,
  initialValue,
  loading = false,
  errorMessage,
  onSubmit,
}: JugadorFormProps) {
  const sedesQuery = useSedesLookup();

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<JugadorFormFields>({
    resolver: zodResolver(jugadorFormSchema),
    defaultValues: {
      nombre: "",
      apellidos: "",
      email: "",
      telefono: "",
      fechaNacimiento: "",
      dorsal: null,
      posicion: "",
      pieDominante: null,
      notas: "",
      tutorNombre: "",
      tutorTelefono: "",
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
        dorsal: initialValue?.dorsal ?? null,
        posicion: initialValue?.posicion ?? "",
        pieDominante: initialValue?.pieDominante ?? null,
        notas: initialValue?.notas ?? "",
        tutorNombre: initialValue?.tutorNombre ?? "",
        tutorTelefono: initialValue?.tutorTelefono ?? "",
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
      dorsal: values.dorsal ?? null,
      posicion: values.posicion?.trim() || null,
      pieDominante: values.pieDominante ?? null,
      notas: values.notas?.trim() || null,
      tutorNombre: values.tutorNombre?.trim() || null,
      tutorTelefono: values.tutorTelefono?.trim() || null,
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

              <FormSection label="Datos deportivos" />

              <FormField label="Dorsal" error={errors.dorsal?.message}>
                <Controller
                  control={control}
                  name="dorsal"
                  render={({ field }) => (
                    <Input
                      type="number"
                      min={0}
                      max={999}
                      name={field.name}
                      ref={field.ref}
                      value={field.value ?? ""}
                      onBlur={field.onBlur}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      disabled={loading}
                    />
                  )}
                />
              </FormField>

              <FormField label="Posición" error={errors.posicion?.message}>
                <Input autoComplete="off" placeholder="Ej: Delantero, Pívot..." disabled={loading} {...register("posicion")} />
              </FormField>

              <FormField label="Pie dominante" error={errors.pieDominante?.message}>
                <Controller
                  control={control}
                  name="pieDominante"
                  render={({ field }) => (
                    <Select
                      items={PIE_DOMINANTE_OPTIONS}
                      value={field.value ?? null}
                      onValueChange={(v) => field.onChange(v || null)}
                      disabled={loading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {PIE_DOMINANTE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormSection label="Tutor / Padre" />

              <FormField label="Nombre del tutor" error={errors.tutorNombre?.message}>
                <Input autoComplete="off" disabled={loading} {...register("tutorNombre")} />
              </FormField>

              <FormField label="Teléfono del tutor" error={errors.tutorTelefono?.message}>
                <Input autoComplete="off" disabled={loading} {...register("tutorTelefono")} />
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
