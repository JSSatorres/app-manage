"use client";

import { useEffect, useState, useCallback } from "react";
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
import type { Sesion, SesionCreateInput } from "@/types/sesiones";
import type { EstadoSesion, PeriodoTemporada } from "@/lib/constants";
import { Trash2, Plus } from "lucide-react";

// ─── tipos ────────────────────────────────────────────────────────────────────

interface SesionFormValue {
  fecha: string;
  horaInicio: string;
  horaFin: string;
  duracionEstimada: string;
  equipoId: string;
  entrenadorIds: string[];
  periodoTemporada: string;
  objetivoSesion: string;
  observacionesPrevias: string;
  estado: string;
}

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

interface EjercicioLinea extends SesionDetalleUpsertItem {
  _key: number;
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
  base: SesionFormValue,
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
        periodoTemporada: base.periodoTemporada ? (base.periodoTemporada as PeriodoTemporada) : null,
        objetivoSesion: base.objetivoSesion || null,
        observacionesPrevias: base.observacionesPrevias || null,
        estado: base.estado as EstadoSesion,
      });
    }
  }
  return resultado;
}

// ─── props ────────────────────────────────────────────────────────────────────

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

  // ── campos base (solo para modo edición o sesión única) ───────────────────
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [duracionEstimada, setDuracionEstimada] = useState("");
  const [equipoId, setEquipoId] = useState("");
  const [entrenadorIds, setEntrenadorIds] = useState<string[]>([]);
  const [periodoTemporada, setPeriodoTemporada] = useState("");
  const [objetivoSesion, setObjetivoSesion] = useState("");
  const [observacionesPrevias, setObservacionesPrevias] = useState("");
  const [estado, setEstado] = useState<string>(ESTADO_SESION.BORRADOR);
  const [touched, setTouched] = useState(false);

  // ── repetidor (siempre activo al crear) ──────────────────────────────────
  const [franjas, setFranjas] = useState<FranjaDia[]>([]);
  const [fechaInicioRep, setFechaInicioRep] = useState("");
  const [fechaFinRep, setFechaFinRep] = useState("");

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
      // Campos base: edición usa los valores de initialValue, creación usa defaults
      setFecha(initialValue?.fecha ?? "");
      setHoraInicio(initialValue?.horaInicio ?? "");
      setHoraFin("");
      setDuracionEstimada(
        initialValue?.duracionEstimada != null ? String(initialValue.duracionEstimada) : "",
      );
      setPeriodoTemporada(initialValue?.periodoTemporada ?? "");
      setObjetivoSesion(initialValue?.objetivoSesion ?? "");
      setObservacionesPrevias(initialValue?.observacionesPrevias ?? "");
      setEstado(initialValue?.estado ?? ESTADO_SESION.BORRADOR);
      setTouched(false);
      setFranjas([]);
      setFechaInicioRep("");
      setFechaFinRep("");
      setEjercicioSelectorId("");

      if (isCreating && equipos.length > 0 && entrenadores.length > 0) {
        // Datos ya disponibles: auto-seleccionar equipo y TODOS sus entrenadores
        const defaultEquipo = equipos[0];
        const matchEntrenadores = defaultEquipo.entrenadorIds.filter((id) =>
          entrenadores.some((e) => e.id === id),
        );
        setEquipoId(defaultEquipo.id);
        setEntrenadorIds(matchEntrenadores);
      } else {
        setEquipoId(initialValue?.equipoId ?? "");
        setEntrenadorIds(initialValue?.entrenadorIds ?? []);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValue]);

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
    setEquipoId((prev) => prev || defaultEquipo.id);
    setEntrenadorIds((prev) => (prev.length > 0 ? prev : matchEntrenadores));
  }, [open, initialValue, equiposQuery.loading, equiposQuery.data, entrenadoresQuery.loading, entrenadoresQuery.data]);

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

  // ── validación ────────────────────────────────────────────────────────────
  const current: SesionFormValue = {
    fecha, horaInicio, horaFin, duracionEstimada,
    equipoId, entrenadorIds,
    periodoTemporada, objetivoSesion, observacionesPrevias, estado,
  };

  // En modo edición: valida campos de la sesión concreta
  // En modo creación: valida equipo + entrenador + rango de fechas
  const esEdicion = !!initialValue;

  const baseValid = esEdicion
    ? !!equipoId && entrenadorIds.length > 0 && !!fecha
    : !!equipoId && entrenadorIds.length > 0 && !!fechaInicioRep;

  const repetirValid =
    franjas.length > 0 &&
    !!fechaInicioRep &&
    !!fechaFinRep &&
    fechaFinRep >= fechaInicioRep &&
    franjas.every((f) => !!f.horaInicio);

  // Sesión única: usa fechaInicioRep como fecha, sin días seleccionados
  const esSesionUnica = !esEdicion && franjas.length === 0 && !!fechaInicioRep;

  const sesionesPreview = !esEdicion && repetirValid
    ? buildRepeticiones(current, franjas, fechaInicioRep, fechaFinRep)
    : [];

  const canSave = esEdicion
    ? baseValid
    : (esSesionUnica || repetirValid) && !!equipoId && entrenadorIds.length > 0;

  // ── submit ────────────────────────────────────────────────────────────────
  async function handleGuardar() {
    setTouched(true);
    if (!canSave) return;

    if (esEdicion) {
      await onSubmit(current);
      await upsertSesionDetalle(initialValue!.id, ejerciciosLineas);
    } else if (esSesionUnica) {
      // Sesión única con fecha = fechaInicioRep
      const payload = { ...current, fecha: fechaInicioRep };
      await onSubmit(payload);
    } else if (onSubmitBulk && repetirValid) {
      await onSubmitBulk(sesionesPreview);
    }
  }

  const submitLabel = loading
    ? "Guardando…"
    : sesionesPreview.length > 0
      ? `Crear ${sesionesPreview.length} sesiones`
      : "Guardar";

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden w-[calc(100vw-2rem)] sm:w-auto p-4 sm:p-8">
        <DialogHeader className="mb-1 sm:mb-2">
          <DialogTitle className="text-lg sm:text-xl">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-6">

          {/* ── BLOQUE 1: Equipo ── */}
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label>Equipo *</Label>
              <Select
                value={equiposQuery.loading ? "" : equipoId}
                onValueChange={(v) => {
                  setEquipoId(v ?? "");
                  setTouched(true);
                  // Al cambiar de equipo: marcar TODOS sus entrenadores por defecto
                  const equipo = (equiposQuery.data ?? []).find((e) => e.id === v);
                  const entrenadoresDisponibles = entrenadoresQuery.data ?? [];
                  const matches = (equipo?.entrenadorIds ?? []).filter((id) =>
                    entrenadoresDisponibles.some((e) => e.id === id),
                  );
                  setEntrenadorIds(matches);
                }}
                disabled={loading || equiposQuery.loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={equiposQuery.loading ? "Cargando…" : "Selecciona un equipo"}>
                    {!equiposQuery.loading && equipoId
                      ? (equiposQuery.data ?? []).find((e) => e.id === equipoId)?.nombre ?? "Selecciona un equipo"
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(equiposQuery.data ?? []).map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          {/* ── Entrenadores (multi-selección) ── */}
          <div className="space-y-2">
            <Label>Entrenadores *</Label>
            {entrenadoresQuery.loading ? (
              <p className="text-xs text-muted-foreground">Cargando…</p>
            ) : (
              <MultiCheckboxList
                options={(entrenadoresQuery.data ?? []).map((e) => ({
                  id: e.id,
                  label: [e.nombre, e.apellidos].filter(Boolean).join(" "),
                }))}
                value={entrenadorIds}
                onChange={(ids) => { setEntrenadorIds(ids); setTouched(true); }}
                disabled={loading}
                emptyText="No hay entrenadores en esta sede."
              />
            )}
          </div>

          {/* ── BLOQUE 2: Periodo + Estado ── */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label>Periodo</Label>
              <Select value={periodoTemporada} onValueChange={(v) => setPeriodoTemporada(v ?? "")} disabled={loading}>
                <SelectTrigger><SelectValue placeholder="Sin periodo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin periodo</SelectItem>
                  <SelectItem value={PERIODO_TEMPORADA.PRETEMPORADA}>Pretemporada</SelectItem>
                  <SelectItem value={PERIODO_TEMPORADA.COMPETICION}>Competición</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={estado} onValueChange={(v) => setEstado(v ?? "")} disabled={loading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ESTADO_SESION.BORRADOR}>Borrador</SelectItem>
                  <SelectItem value={ESTADO_SESION.PLANIFICADA}>Planificada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── BLOQUE 3: Objetivo + Observaciones ── */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="ses-objetivo">Objetivo sesión</Label>
              <Input id="ses-objetivo" value={objetivoSesion} onChange={(e) => setObjetivoSesion(e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ses-obs">Observaciones</Label>
              <Input id="ses-obs" value={observacionesPrevias} onChange={(e) => setObservacionesPrevias(e.target.value)} disabled={loading} />
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
                  value={fecha}
                  onChange={(e) => { setFecha(e.target.value); setTouched(true); }}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ses-hora">Hora inicio</Label>
                <Input
                  id="ses-hora"
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ses-duracion">Duración (min)</Label>
                <Input
                  id="ses-duracion"
                  inputMode="numeric"
                  value={duracionEstimada}
                  onChange={(e) => setDuracionEstimada(e.target.value)}
                  disabled={loading}
                />
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
              {franjas.length > 0 && !repetirValid && fechaInicioRep && fechaFinRep && (
                <p className="text-sm text-destructive">
                  Define la hora de inicio para cada día seleccionado.
                </p>
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
          {touched && !canSave && (
            <p className="text-sm text-destructive">
              {!equipoId || entrenadorIds.length === 0
                ? "Equipo y al menos un entrenador son obligatorios."
                : !fechaInicioRep && !esEdicion
                  ? "Define al menos la fecha de inicio."
                  : "Revisa los campos obligatorios."}
            </p>
          )}
          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

          {/* ── Acciones ── */}
          <div className="flex justify-end gap-2 sm:gap-3 pt-1 sm:pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleGuardar} disabled={loading || !canSave}>
              {submitLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
