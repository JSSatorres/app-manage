"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { z } from "zod";
import { useForm, Controller, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiCheckboxList } from "@/components/shared/MultiCheckboxList";
import { useEquiposLookup } from "@/hooks/useEquiposLookup";
import { useEntrenadoresLookupBySedes } from "@/hooks/useEntrenadoresLookupBySedes";
import { useQuery } from "@/hooks/useQuery";
import { queryKeys } from "@/hooks/queryKeys";
import { fetchEjercicios } from "@/services/ejercicios.service";
import { upsertSesionDetalle, fetchSesionDetalle } from "@/services/sesion-detalle.service";
import type { SesionDetalleUpsertItem } from "@/services/sesion-detalle.service";
import type { Ejercicio } from "@/types/ejercicios";
import { ESTADO_SESION, PERIODO_TEMPORADA } from "@/lib/constants";
import { createSesionSchema } from "@/schemas/sesion.schema";
import type { Sesion, SesionCreateInput } from "@/types/sesiones";
import type { EstadoSesion, PeriodoTemporada } from "@/lib/constants";
import { Trash2, Plus } from "lucide-react";

// ─── validación (RHF + Zod) ────────────────────────────────────────────────
// `createSesionSchema` cubre los campos "base" de la sesión (equipo,
// entrenadores, periodo, objetivo, observaciones, estado y, en edición,
// fecha/hora/duración). El programador de fechas (franjas, rango, días de la
// semana) no forma parte de la entidad `Sesion`: es un asistente que genera N
// `SesionCreateInput`, así que se valida aparte (ver `buildRepeticiones`).
const sesionCreacionFormSchema = createSesionSchema.omit({ fecha: true });
const sesionEdicionFormSchema = createSesionSchema;

type SesionFormFields = z.input<typeof createSesionSchema>;

const DIAS_SEMANA = [
  { id: 1, label: "Lun" },
  { id: 2, label: "Mar" },
  { id: 3, label: "Mié" },
  { id: 4, label: "Jue" },
  { id: 5, label: "Vie" },
  { id: 6, label: "Sáb" },
  { id: 0, label: "Dom" },
] as const;

interface FranjaDia {
  diaId: number;
  horaInicio: string;
  horaFin: string;
}

const PERIODO_OPTIONS = [
  { value: "", label: "Sin periodo" },
  { value: PERIODO_TEMPORADA.PRETEMPORADA, label: "Pretemporada" },
  { value: PERIODO_TEMPORADA.COMPETICION, label: "Competición" },
] as const;

const ESTADO_OPTIONS = [
  { value: ESTADO_SESION.BORRADOR, label: "Borrador" },
  { value: ESTADO_SESION.PLANIFICADA, label: "Planificada" },
] as const;

interface EjercicioLinea extends SesionDetalleUpsertItem {
  _key: number;
}

interface SesionFormBase {
  equipoId: string;
  entrenadorIds: string[];
  periodoTemporada: PeriodoTemporada | null;
  objetivoSesion: string | null;
  observacionesPrevias: string | null;
  estado: EstadoSesion;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function calcDuracion(ini: string, fin: string): number | null {
  if (!ini || !fin) return null;
  const [ih, im] = ini.split(":").map(Number);
  const [fh, fm] = fin.split(":").map(Number);
  const mins = fh * 60 + fm - (ih * 60 + im);
  return mins > 0 ? mins : null;
}

function generarFechas(fechaInicio: string, fechaFin: string, diasIds: number[]): string[] {
  const resultado: string[] = [];
  if (!fechaInicio || !fechaFin || !diasIds.length) return resultado;
  const cursor = new Date(fechaInicio + "T00:00:00");
  const end = new Date(fechaFin + "T00:00:00");
  while (cursor <= end) {
    if (diasIds.includes(cursor.getDay())) {
      resultado.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return resultado;
}

function buildRepeticiones(
  base: SesionFormBase,
  franjas: FranjaDia[],
  fechaInicioRep: string,
  fechaFinRep: string,
): SesionCreateInput[] {
  if (!franjas.length || !fechaInicioRep || !fechaFinRep) return [];
  const resultado: SesionCreateInput[] = [];
  for (const franja of franjas) {
    const fechas = generarFechas(fechaInicioRep, fechaFinRep, [franja.diaId]);
    const duracion = calcDuracion(franja.horaInicio, franja.horaFin);
    for (const fecha of fechas) {
      resultado.push({
        fecha,
        horaInicio: franja.horaInicio || null,
        duracionEstimada: duracion,
        equipoId: base.equipoId,
        entrenadorIds: base.entrenadorIds,
        microciclo: null,
        periodoTemporada: base.periodoTemporada,
        objetivoSesion: base.objetivoSesion,
        observacionesPrevias: base.observacionesPrevias,
        estado: base.estado,
      });
    }
  }
  return resultado;
}

// ─── props ────────────────────────────────────────────────────────────────────

interface SesionFormValue {
  fecha: string;
  horaInicio: string | null;
  duracionEstimada: number | null;
  equipoId: string;
  entrenadorIds: string[];
  periodoTemporada: string | null;
  objetivoSesion: string | null;
  observacionesPrevias: string | null;
  estado: string;
}

interface SesionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  sedeIds: string[];
  initialValue?: Sesion | null;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (value: SesionFormValue) => Promise<void> | void;
  onSubmitBulk?: (sesiones: SesionCreateInput[]) => Promise<void> | void;
}

// ─── componente ───────────────────────────────────────────────────────────────

export function SesionForm({
  open,
  onOpenChange,
  title,
  sedeIds,
  initialValue,
  loading = false,
  errorMessage,
  onSubmit,
  onSubmitBulk,
}: SesionFormProps) {
  const equiposQuery = useEquiposLookup(sedeIds);
  const entrenadoresQuery = useEntrenadoresLookupBySedes(sedeIds);

  const sedeId = sedeIds[0] ?? null;
  const ejerciciosQuery = useQuery<Ejercicio[]>(
    () => (sedeId ? fetchEjercicios(sedeId) : Promise.resolve({ data: [], error: null })),
    queryKeys.ejercicios.list(sedeId),
  );

  const esEdicion = !!initialValue;

  // Resolver dinámico: en edición la fecha es obligatoria (sesión concreta);
  // al crear, la fecha la decide el programador (franjas/rango), no RHF.
  const resolver = useMemo(
    () =>
      zodResolver(
        esEdicion ? sesionEdicionFormSchema : sesionCreacionFormSchema,
      ) as unknown as Resolver<SesionFormFields>,
    [esEdicion],
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<SesionFormFields>({
    resolver,
    defaultValues: {
      fecha: "",
      horaInicio: "",
      duracionEstimada: null,
      equipoId: "",
      entrenadorIds: [],
      periodoTemporada: null,
      objetivoSesion: "",
      observacionesPrevias: "",
      estado: ESTADO_SESION.BORRADOR,
    },
  });

  const equipoId = useWatch({ control, name: "equipoId" }) ?? "";
  const entrenadorIds = useWatch({ control, name: "entrenadorIds" }) ?? [];

  // ── repetidor (siempre activo al crear) ──────────────────────────────────
  const [franjas, setFranjas] = useState<FranjaDia[]>([]);
  const [fechaInicioRep, setFechaInicioRep] = useState("");
  const [fechaFinRep, setFechaFinRep] = useState("");
  const [repeaterError, setRepeaterError] = useState<string | null>(null);

  // ── ejercicios ────────────────────────────────────────────────────────────
  const [ejerciciosLineas, setEjerciciosLineas] = useState<EjercicioLinea[]>([]);
  const [ejercicioSelectorId, setEjercicioSelectorId] = useState("");

  // ── reset al abrir + auto-selección de defaults al crear ─────────────────
  useEffect(() => {
    if (!open) return;
    const equipos = equiposQuery.data ?? [];
    const entrenadores = entrenadoresQuery.data ?? [];
    const isCreating = !initialValue;

    queueMicrotask(() => {
      let defaultEquipoId = initialValue?.equipoId ?? "";
      let defaultEntrenadorIds = initialValue?.entrenadorIds ?? [];

      if (isCreating && equipos.length > 0 && entrenadores.length > 0) {
        // Datos ya disponibles: auto-seleccionar equipo y TODOS sus entrenadores
        const defaultEquipo = equipos[0];
        defaultEquipoId = defaultEquipo.id;
        defaultEntrenadorIds = defaultEquipo.entrenadorIds.filter((id) =>
          entrenadores.some((e) => e.id === id),
        );
      }

      reset({
        fecha: initialValue?.fecha ?? "",
        horaInicio: initialValue?.horaInicio ?? "",
        duracionEstimada: initialValue?.duracionEstimada ?? null,
        equipoId: defaultEquipoId,
        entrenadorIds: defaultEntrenadorIds,
        periodoTemporada: initialValue?.periodoTemporada ?? null,
        objetivoSesion: initialValue?.objetivoSesion ?? "",
        observacionesPrevias: initialValue?.observacionesPrevias ?? "",
        estado: initialValue?.estado ?? ESTADO_SESION.BORRADOR,
      });
      setFranjas([]);
      setFechaInicioRep("");
      setFechaFinRep("");
      setEjercicioSelectorId("");
      setRepeaterError(null);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValue, reset]);

  // Al crear: auto-seleccionar cuando los datos llegan después de abrir el form
  useEffect(() => {
    if (!open || initialValue) return;
    if (equiposQuery.loading || entrenadoresQuery.loading) return;
    const equipos = equiposQuery.data ?? [];
    const entrenadores = entrenadoresQuery.data ?? [];
    if (equipos.length === 0) return;
    const defaultEquipo = equipos[0];
    const matchEntrenadores = defaultEquipo.entrenadorIds.filter((id) =>
      entrenadores.some((e) => e.id === id),
    );
    if (!getValues("equipoId")) setValue("equipoId", defaultEquipo.id);
    if ((getValues("entrenadorIds") ?? []).length === 0) {
      setValue("entrenadorIds", matchEntrenadores);
    }
  }, [open, initialValue, equiposQuery.loading, equiposQuery.data, entrenadoresQuery.loading, entrenadoresQuery.data, getValues, setValue]);

  // Cargar ejercicios existentes al editar
  useEffect(() => {
    if (!open || !initialValue) { queueMicrotask(() => setEjerciciosLineas([])); return; }
    fetchSesionDetalle(initialValue.id).then(({ data }) => {
      if (!data) return;
      setEjerciciosLineas(
        data.map((d, i) => ({
          _key: i,
          ejercicioId: d.ejercicioId,
          orden: d.orden,
          tiempoEjecucion: d.tiempoEjecucion,
          tiempoDescanso: d.tiempoDescanso,
          varianteAplicada: d.varianteAplicada,
          fechaDesde: (d as unknown as Record<string, string | null>).fechaDesde ?? null,
          fechaHasta: (d as unknown as Record<string, string | null>).fechaHasta ?? null,
        })),
      );
    });
  }, [open, initialValue]);

  // ── repetidor callbacks ───────────────────────────────────────────────────
  const toggleDia = useCallback((diaId: number) => {
    setFranjas((prev) => {
      const existe = prev.find((f) => f.diaId === diaId);
      if (existe) return prev.filter((f) => f.diaId !== diaId);
      return [...prev, { diaId, horaInicio: "12:00", horaFin: "13:00" }].sort((a, b) => {
        const order = [1, 2, 3, 4, 5, 6, 0];
        return order.indexOf(a.diaId) - order.indexOf(b.diaId);
      });
    });
  }, []);

  const updateFranja = useCallback((diaId: number, field: "horaInicio" | "horaFin", val: string) => {
    setFranjas((prev) => prev.map((f) => (f.diaId === diaId ? { ...f, [field]: val } : f)));
  }, []);

  // ── ejercicios callbacks ──────────────────────────────────────────────────
  function addEjercicio() {
    if (!ejercicioSelectorId) return;
    if (ejerciciosLineas.some((l) => l.ejercicioId === ejercicioSelectorId)) {
      setEjercicioSelectorId("");
      return;
    }
    setEjerciciosLineas((prev) => [
      ...prev,
      {
        _key: Date.now(),
        ejercicioId: ejercicioSelectorId,
        orden: prev.length + 1,
        tiempoEjecucion: null,
        tiempoDescanso: null,
        varianteAplicada: null,
        fechaDesde: null,
        fechaHasta: null,
      },
    ]);
    setEjercicioSelectorId("");
  }

  function removeEjercicio(key: number) {
    setEjerciciosLineas((prev) =>
      prev.filter((l) => l._key !== key).map((l, i) => ({ ...l, orden: i + 1 })),
    );
  }

  function updateLinea<K extends keyof EjercicioLinea>(key: number, field: K, val: EjercicioLinea[K]) {
    setEjerciciosLineas((prev) => prev.map((l) => (l._key === key ? { ...l, [field]: val } : l)));
  }

  // ── preview del repetidor (solo informativo; la validación real va en el submit) ──
  const repetirValid =
    franjas.length > 0 &&
    !!fechaInicioRep &&
    !!fechaFinRep &&
    fechaFinRep >= fechaInicioRep &&
    franjas.every((f) => !!f.horaInicio);

  const esSesionUnica = !esEdicion && franjas.length === 0 && !!fechaInicioRep;

  const sesionesPreview = !esEdicion && repetirValid
    ? buildRepeticiones(
        {
          equipoId,
          entrenadorIds,
          periodoTemporada: null,
          objetivoSesion: null,
          observacionesPrevias: null,
          estado: ESTADO_SESION.BORRADOR,
        },
        franjas,
        fechaInicioRep,
        fechaFinRep,
      )
    : [];

  // ── submit ────────────────────────────────────────────────────────────────
  const submit = handleSubmit(async (values) => {
    if (esEdicion) {
      setRepeaterError(null);
      await onSubmit({
        fecha: values.fecha,
        horaInicio: values.horaInicio || null,
        duracionEstimada: values.duracionEstimada ?? null,
        equipoId: values.equipoId,
        entrenadorIds: values.entrenadorIds,
        periodoTemporada: values.periodoTemporada ?? null,
        objetivoSesion: (values.objetivoSesion ?? "").trim() || null,
        observacionesPrevias: (values.observacionesPrevias ?? "").trim() || null,
        estado: values.estado ?? ESTADO_SESION.BORRADOR,
      });
      await upsertSesionDetalle(initialValue!.id, ejerciciosLineas);
      return;
    }

    const base: SesionFormBase = {
      equipoId: values.equipoId,
      entrenadorIds: values.entrenadorIds,
      periodoTemporada: values.periodoTemporada ?? null,
      objetivoSesion: (values.objetivoSesion ?? "").trim() || null,
      observacionesPrevias: (values.observacionesPrevias ?? "").trim() || null,
      estado: values.estado ?? ESTADO_SESION.BORRADOR,
    };

    if (franjas.length === 0) {
      // Sesión única: la fecha viene del campo "Desde" del programador.
      if (!fechaInicioRep) {
        setRepeaterError("Define al menos la fecha de inicio.");
        return;
      }
      setRepeaterError(null);
      await onSubmit({
        fecha: fechaInicioRep,
        horaInicio: null,
        duracionEstimada: null,
        ...base,
      });
      return;
    }

    // Repetición: exige rango de fechas válido + hora de inicio por día.
    if (!fechaInicioRep || !fechaFinRep || fechaFinRep < fechaInicioRep) {
      setRepeaterError("Define un rango de fechas válido.");
      return;
    }
    if (!franjas.every((f) => !!f.horaInicio)) {
      setRepeaterError("Define la hora de inicio para cada día seleccionado.");
      return;
    }
    setRepeaterError(null);
    if (onSubmitBulk) {
      await onSubmitBulk(buildRepeticiones(base, franjas, fechaInicioRep, fechaFinRep));
    }
  });

  const submitLabel = loading
    ? "Guardando…"
    : sesionesPreview.length > 0
      ? `Crear ${sesionesPreview.length} sesiones`
      : "Guardar";

  const equipoOptions = useMemo(
    () => (equiposQuery.data ?? []).map((e) => ({ value: e.id, label: e.nombre })),
    [equiposQuery.data],
  );

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden w-[calc(100vw-2rem)] sm:w-auto p-4 sm:p-8">
        <DialogHeader className="mb-1 sm:mb-2">
          <DialogTitle className="text-lg sm:text-xl">{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3 sm:space-y-6">

          {/* ── BLOQUE 1: Equipo ── */}
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label>Equipo *</Label>
              <Controller
                control={control}
                name="equipoId"
                render={({ field }) => (
                  <Select
                    items={equipoOptions}
                    value={equiposQuery.loading ? null : (field.value || null)}
                    onValueChange={(v) => {
                      field.onChange(v ?? "");
                      // Al cambiar de equipo: marcar TODOS sus entrenadores por defecto
                      const equipo = (equiposQuery.data ?? []).find((e) => e.id === v);
                      const entrenadoresDisponibles = entrenadoresQuery.data ?? [];
                      const matches = (equipo?.entrenadorIds ?? []).filter((id) =>
                        entrenadoresDisponibles.some((e) => e.id === id),
                      );
                      setValue("entrenadorIds", matches, { shouldValidate: true });
                    }}
                    disabled={loading || equiposQuery.loading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={equiposQuery.loading ? "Cargando…" : "Selecciona un equipo"} />
                    </SelectTrigger>
                    <SelectContent>
                      {equipoOptions.map((e) => (
                        <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.equipoId && (
                <p className="text-sm text-destructive">{errors.equipoId.message}</p>
              )}
            </div>

          </div>

          {/* ── Entrenadores (multi-selección) ── */}
          <div className="space-y-2">
            <Label>Entrenadores *</Label>
            {entrenadoresQuery.loading ? (
              <p className="text-xs text-muted-foreground">Cargando…</p>
            ) : (
              <Controller
                control={control}
                name="entrenadorIds"
                render={({ field }) => (
                  <MultiCheckboxList
                    options={(entrenadoresQuery.data ?? []).map((e) => ({
                      id: e.id,
                      label: [e.nombre, e.apellidos].filter(Boolean).join(" "),
                    }))}
                    value={field.value ?? []}
                    onChange={field.onChange}
                    disabled={loading}
                    emptyText="No hay entrenadores en esta sede."
                  />
                )}
              />
            )}
            {errors.entrenadorIds && (
              <p className="text-sm text-destructive">{errors.entrenadorIds.message}</p>
            )}
          </div>

          {/* ── BLOQUE 2: Periodo + Estado ── */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label>Periodo</Label>
              <Controller
                control={control}
                name="periodoTemporada"
                render={({ field }) => (
                  <Select
                    items={PERIODO_OPTIONS}
                    value={field.value || ""}
                    onValueChange={(v) => field.onChange(v || null)}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-full"><SelectValue placeholder="Sin periodo" /></SelectTrigger>
                    <SelectContent>
                      {PERIODO_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Controller
                control={control}
                name="estado"
                render={({ field }) => (
                  <Select
                    items={ESTADO_OPTIONS}
                    value={field.value ?? ESTADO_SESION.BORRADOR}
                    onValueChange={(v) => field.onChange(v ?? ESTADO_SESION.BORRADOR)}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ESTADO_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* ── BLOQUE 3: Objetivo + Observaciones ── */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="ses-objetivo">Objetivo sesión</Label>
              <Input id="ses-objetivo" disabled={loading} {...register("objetivoSesion")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ses-obs">Observaciones</Label>
              <Input id="ses-obs" disabled={loading} {...register("observacionesPrevias")} />
            </div>
          </div>

          {/* ── BLOQUE 4: Fecha / Programación ── */}
          {esEdicion ? (
            /* Modo edición: fecha + hora de la sesión concreta */
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="ses-fecha">Fecha *</Label>
                <Input
                  id="ses-fecha"
                  type="date"
                  disabled={loading}
                  {...register("fecha")}
                />
                {errors.fecha && (
                  <p className="text-sm text-destructive">{errors.fecha.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ses-hora">Hora inicio</Label>
                <Input
                  id="ses-hora"
                  type="time"
                  disabled={loading}
                  {...register("horaInicio")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ses-duracion">Duración (min)</Label>
                <Controller
                  control={control}
                  name="duracionEstimada"
                  render={({ field }) => (
                    <Input
                      id="ses-duracion"
                      type="number"
                      min={1}
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
                {errors.duracionEstimada && (
                  <p className="text-sm text-destructive">{errors.duracionEstimada.message}</p>
                )}
              </div>
            </div>
          ) : (
            /* Modo creación: programador de sesiones */
            <div className="rounded-lg border bg-muted/20 p-3 sm:p-6 space-y-3 sm:space-y-5">
              <p className="text-sm font-medium">Programación de sesiones</p>

              {/* Rango de fechas */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="space-y-1.5">
                  <Label>Desde *</Label>
                  <Input type="date" value={fechaInicioRep} onChange={(e) => setFechaInicioRep(e.target.value)} disabled={loading} className="px-1.5 sm:px-2.5" />
                </div>
                <div className="space-y-1.5">
                  <Label className="leading-tight">Hasta <span className="text-muted-foreground font-normal text-xs hidden sm:inline">(opcional para sesión única)</span></Label>
                  <Input type="date" value={fechaFinRep} onChange={(e) => setFechaFinRep(e.target.value)} disabled={loading} className="px-1.5 sm:px-2.5" />
                </div>
              </div>

              {/* Días de la semana */}
              <div className="space-y-2">
                <Label>Días de la semana <span className="text-muted-foreground font-normal text-xs">(vacío = sesión única en la fecha &ldquo;Desde&rdquo;)</span></Label>
                <div className="flex flex-wrap gap-2">
                  {DIAS_SEMANA.map((d) => {
                    const activo = franjas.some((f) => f.diaId === d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDia(d.id)}
                        disabled={loading}
                        className={[
                          "px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium border transition-colors",
                          activo
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-border hover:border-primary/50",
                        ].join(" ")}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Franjas horarias por día */}
              {franjas.length > 0 && (
                <div className="space-y-2">
                  <Label>Horario por día</Label>
                  <div className="space-y-2">
                    {franjas.map((franja) => {
                      const dia = DIAS_SEMANA.find((d) => d.id === franja.diaId);
                      const dur = franja.horaInicio && franja.horaFin
                        ? calcDuracion(franja.horaInicio, franja.horaFin)
                        : null;
                      return (
                        <div key={franja.diaId} className="grid grid-cols-[2.5rem_1fr_auto_1fr_auto] items-center gap-1.5">
                          <span className="text-sm font-medium text-muted-foreground">{dia?.label}</span>
                          <Input
                            type="time"
                            value={franja.horaInicio}
                            onChange={(e) => updateFranja(franja.diaId, "horaInicio", e.target.value)}
                            disabled={loading}
                            className="min-w-0 px-1.5 tabular-nums"
                          />
                          <span className="text-muted-foreground text-sm text-center">→</span>
                          <Input
                            type="time"
                            value={franja.horaFin}
                            onChange={(e) => updateFranja(franja.diaId, "horaFin", e.target.value)}
                            disabled={loading}
                            className="min-w-0 px-1.5 tabular-nums"
                          />
                          <span className="text-xs text-muted-foreground tabular-nums text-right">
                            {dur != null ? `${dur}m` : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Preview / resumen */}
              {esSesionUnica && (
                <p className="text-sm text-muted-foreground">
                  Se creará <span className="font-semibold text-foreground">1</span> sesión el{" "}
                  <span className="font-semibold text-foreground">{fechaInicioRep}</span>.
                </p>
              )}
              {sesionesPreview.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Se crearán{" "}
                  <span className="font-semibold text-foreground">{sesionesPreview.length}</span>{" "}
                  sesiones.
                </p>
              )}
              {repeaterError && (
                <p className="text-sm text-destructive">{repeaterError}</p>
              )}
            </div>
          )}

          {/* ── BLOQUE 5: Ejercicios ── */}
          <div className="space-y-3 sm:space-y-4">
            <Label>Ejercicios</Label>

            {/* Selector */}
            <div className="flex gap-2">
              <Select
                value={ejercicioSelectorId}
                onValueChange={(v) => setEjercicioSelectorId(v ?? "")}
                disabled={loading || ejerciciosQuery.loading}
              >
                <SelectTrigger className="flex-1 min-w-0">
                  <SelectValue placeholder={ejerciciosQuery.loading ? "Cargando…" : "Añadir ejercicio…"}>
                    {(id) => (ejerciciosQuery.data ?? []).find((e) => e.id === id)?.titulo ?? id as string}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-4rem)]">
                  {(ejerciciosQuery.data ?? [])
                    .filter((e) => !ejerciciosLineas.some((l) => l.ejercicioId === e.id))
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id} className="items-start">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-sm font-medium leading-snug whitespace-normal">{e.titulo}</span>
                          {e.objetivoPrincipal && (
                            <span className="text-xs text-muted-foreground whitespace-normal leading-snug">
                              {e.objetivoPrincipal}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={addEjercicio}
                disabled={!ejercicioSelectorId || loading}
              >
                <Plus className="size-4" />
              </Button>
            </div>

            {/* Lista */}
            {ejerciciosLineas.length > 0 && (
              <div className="space-y-2">
                {ejerciciosLineas.map((linea, idx) => {
                  const ej = (ejerciciosQuery.data ?? []).find((e) => e.id === linea.ejercicioId);
                  return (
                    <div key={linea._key} className="rounded-md border bg-background p-3 space-y-3">
                      {/* Cabecera */}
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-mono text-muted-foreground pt-0.5 w-4 shrink-0">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-snug">{ej?.titulo ?? "Ejercicio"}</p>
                          {ej?.objetivoPrincipal && (
                            <p className="text-xs text-muted-foreground mt-0.5">{ej.objetivoPrincipal}</p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeEjercicio(linea._key)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>

                      {/* Campos en grid 2x2 */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Desde</Label>
                          <Input
                            type="date"
                            value={linea.fechaDesde ?? ""}
                            onChange={(e) => updateLinea(linea._key, "fechaDesde", e.target.value || null)}
                            disabled={loading}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Hasta</Label>
                          <Input
                            type="date"
                            value={linea.fechaHasta ?? ""}
                            onChange={(e) => updateLinea(linea._key, "fechaHasta", e.target.value || null)}
                            disabled={loading}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Duración (min)</Label>
                          <Input
                            type="number"
                            min={1}
                            value={linea.tiempoEjecucion ?? ""}
                            onChange={(e) => updateLinea(linea._key, "tiempoEjecucion", e.target.value ? Number(e.target.value) : null)}
                            disabled={loading}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Descanso (min)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={linea.tiempoDescanso ?? ""}
                            onChange={(e) => updateLinea(linea._key, "tiempoDescanso", e.target.value ? Number(e.target.value) : null)}
                            disabled={loading}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Errores ── */}
          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

          {/* ── Acciones ── */}
          <div className="flex justify-end gap-2 sm:gap-3 pt-1 sm:pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
