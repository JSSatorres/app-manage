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
import { Switch } from "@/components/ui/switch";
import { FormField } from "@/components/shared/FormField";
import { MultiSelect, type MultiSelectOption } from "@/components/shared/MultiSelect";
import { useSedesLookup } from "@/hooks/useSedesLookup";
import { useQuery } from "@/hooks/useQuery";
import { queryKeys } from "@/hooks/queryKeys";
import { fetchDocumentosDisponibles } from "@/services/documentos.service";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import { createEjercicioSchema } from "@/schemas/ejercicio.schema";
import type { Ejercicio, EjercicioCreateInput } from "@/types/ejercicios";
import type { Documento } from "@/types/documentos";

export type EjercicioFormValue = Omit<EjercicioCreateInput, "workspaceId">;

const ejercicioFormSchema = createEjercicioSchema;

type EjercicioFormFields = z.input<typeof ejercicioFormSchema>;

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
  const { activeSede, activeWorkspaceId } = useWorkspaceContext();
  const sedesQuery = useSedesLookup();
  const sedeIds = useMemo(() => (activeSede ? [activeSede.id] : []), [activeSede]);

  const docsQuery = useQuery<Documento[]>(
    () => fetchDocumentosDisponibles(sedeIds, activeWorkspaceId),
    queryKeys.documentos.available(activeWorkspaceId, sedeIds),
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EjercicioFormFields>({
    resolver: zodResolver(ejercicioFormSchema),
    defaultValues: {
      titulo: "",
      objetivoPrincipal: "",
      numeroJugadoresMin: null,
      esGlobal: false,
      sedePropietariaId: null,
      documentoIds: [],
    },
  });

  const esGlobal = useWatch({ control, name: "esGlobal" });

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      reset({
        titulo: initialValue?.titulo ?? "",
        objetivoPrincipal: initialValue?.objetivoPrincipal ?? "",
        numeroJugadoresMin: initialValue?.numeroJugadoresMin ?? null,
        esGlobal: initialValue?.esGlobal ?? false,
        sedePropietariaId: initialValue?.sedePropietariaId ?? null,
        documentoIds: initialValue?.documentoIds ?? [],
      });
    });
  }, [open, initialValue, reset]);

  const sedeOptions = useMemo(
    () => (sedesQuery.data ?? []).map((s) => ({ value: s.id, label: s.nombre })),
    [sedesQuery.data],
  );

  const documentoOptions = useMemo<MultiSelectOption[]>(
    () => (docsQuery.data ?? []).map((d) => ({ value: d.id, label: d.titulo, hint: d.categoriaDoc })),
    [docsQuery.data],
  );

  const submit = handleSubmit((values) => {
    onSubmit({
      titulo: values.titulo.trim(),
      objetivoPrincipal: values.objetivoPrincipal?.trim() || null,
      numeroJugadoresMin: values.numeroJugadoresMin ?? null,
      esGlobal: values.esGlobal,
      sedePropietariaId: values.esGlobal ? null : (values.sedePropietariaId ?? activeSede?.id ?? null),
      documentoIds: values.documentoIds ?? [],
    });
  });

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

        <form onSubmit={submit}>
          <DialogBody>
            <div className="flex flex-col gap-[16px]">
              <FormField label="Título" required error={errors.titulo?.message}>
                <Input autoComplete="off" disabled={loading} {...register("titulo")} />
              </FormField>

              <FormField label="Objetivo principal" error={errors.objetivoPrincipal?.message}>
                <Input autoComplete="off" disabled={loading} {...register("objetivoPrincipal")} />
              </FormField>

              <FormField label="Nº jugadores (mín.)" error={errors.numeroJugadoresMin?.message}>
                <Controller
                  control={control}
                  name="numeroJugadoresMin"
                  render={({ field }) => (
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
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

              <FormField
                label="Documentos"
                error={
                  errors.documentoIds?.message ??
                  (docsQuery.errorMessage
                    ? `No se pudieron cargar los documentos disponibles: ${docsQuery.errorMessage}`
                    : undefined)
                }
              >
                <Controller
                  control={control}
                  name="documentoIds"
                  render={({ field }) => (
                    <MultiSelect
                      options={documentoOptions}
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="Selecciona documentos"
                      emptyMessage={
                        docsQuery.loading
                          ? "Cargando..."
                          : docsQuery.errorMessage
                            ? "No se pudieron cargar los documentos disponibles"
                            : "No hay documentos disponibles"
                      }
                      disabled={loading || docsQuery.loading}
                      searchable
                    />
                  )}
                />
              </FormField>

              <div className="flex items-center justify-between gap-4 rounded-[11px] border border-border bg-secondary/40 px-[14px] py-[11px]">
                <div>
                  <p className="text-[14px] font-semibold">Global</p>
                  <p className="text-[12.5px] text-muted-foreground mt-0.5">Visible para todas las sedes</p>
                </div>
                <Controller
                  control={control}
                  name="esGlobal"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={loading} />
                  )}
                />
              </div>

              {!esGlobal && (
                <FormField label="Sede propietaria" error={errors.sedePropietariaId?.message}>
                  <Controller
                    control={control}
                    name="sedePropietariaId"
                    render={({ field }) => (
                      <Select
                        items={sedeOptions}
                        value={field.value ?? null}
                        onValueChange={(v) => field.onChange(v || null)}
                        disabled={loading || sedesQuery.loading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sin sede (global)" />
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
              )}

              {(sedesQuery.errorMessage || errorMessage) && (
                <p className="text-[12.5px] text-destructive">{sedesQuery.errorMessage ?? errorMessage}</p>
              )}
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
