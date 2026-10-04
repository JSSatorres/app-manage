"use client";

import { useMemo, useState } from "react";
import { CalendarCheck2, CalendarClock, CalendarDays, Clock, LayoutDashboard, Shield, Target } from "lucide-react";
import { DashboardCalendarNavigator } from "@/components/dashboard/DashboardCalendarNavigator";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import { useSesiones } from "@/hooks/useSesiones";
import { useEquiposLookup } from "@/hooks/useEquiposLookup";
import { useUsuariosLookup } from "@/hooks/useUsuariosLookup";
import { ESTADO_SESION, PERIODO_TEMPORADA, type EstadoSesion } from "@/lib/constants";
import { MultiSelect } from "@/components/shared/MultiSelect";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { SesionDetalleDialog } from "@/components/sesiones/SesionDetalleDialog";
import { ESTADO_SESION_DOT, EstadoSesionBadge, estadoSesionLabel } from "@/components/sesiones/EstadoSesionBadge";
import { sectionTones } from "@/lib/sectionTones";
import type { Sesion } from "@/types/sesiones";
import { cn } from "@/lib/utils";

const PERIODO_OPTIONS = [
  { value: PERIODO_TEMPORADA.PRETEMPORADA, label: "Pretemporada" },
  { value: PERIODO_TEMPORADA.COMPETICION, label: "Competición" },
  { value: "__sin_periodo__", label: "Sin periodo" },
];

const ESTADO_OPTIONS = [
  { value: ESTADO_SESION.PLANIFICADA, label: "Planificada" },
  { value: ESTADO_SESION.REALIZADA, label: "Realizada" },
  { value: ESTADO_SESION.BORRADOR, label: "Borrador" },
  { value: ESTADO_SESION.NO_REALIZADA, label: "No realizada" },
];

/** Orden de los segmentos de la barra de distribución semanal. */
const ESTADOS_ORDEN = [
  ESTADO_SESION.REALIZADA,
  ESTADO_SESION.PLANIFICADA,
  ESTADO_SESION.BORRADOR,
  ESTADO_SESION.NO_REALIZADA,
] as const;

/** Máximo de sesiones que se previsualizan dentro de cada día del tablero. */
const MAX_PREVIEW = 3;

function todayISO(): string {
  const d = new Date();
  return toISO(d);
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function formatHora(hora: string | null): string {
  if (!hora) return "";
  return hora.slice(0, 5);
}

function formatFechaLarga(iso: string): string {
  const date = parseISO(iso);
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Lunes de la semana que contiene el día dado */
function getMondayOfWeek(iso: string): Date {
  const d = parseISO(iso);
  const day = d.getDay(); // 0=Dom, 1=Lun...
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d;
}

/** Array de 7 fechas ISO de la semana (Lun→Dom) */
function getWeekDays(iso: string): string[] {
  const monday = getMondayOfWeek(iso);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return toISO(d);
  });
}

/** Etiqueta de rango de semana: "19-25 May 2026" */
function formatWeekRange(weekDays: string[]): string {
  const first = parseISO(weekDays[0]!);
  const last = parseISO(weekDays[6]!);
  const firstDay = first.getDate();
  const lastDay = last.getDate();
  const month = last.toLocaleDateString("es-ES", { month: "short" });
  const year = last.getFullYear();
  if (first.getMonth() === last.getMonth()) {
    return `${firstDay}–${lastDay} ${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
  }
  const firstMonth = first.toLocaleDateString("es-ES", { month: "short" });
  return `${firstDay} ${firstMonth.charAt(0).toUpperCase() + firstMonth.slice(1)} – ${lastDay} ${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
}

export default function DashboardPage() {
  const { sedesDisponibles } = useWorkspaceContext();

  const [sedeIdsFilter, setSedeIdsFilter] = useState<string[]>([]);
  const [periodosFilter, setPeriodosFilter] = useState<string[]>([]);
  const [estadosFilter, setEstadosFilter] = useState<string[]>([]);
  const [selected, setSelected] = useState<Sesion | null>(null);
  const [savingNotas, setSavingNotas] = useState(false);
  const [diaActivo, setDiaActivo] = useState<string>(() => todayISO());

  const allSedeIds = useMemo(
    () => sedesDisponibles.map((s) => s.id),
    [sedesDisponibles],
  );

  const effectiveSedeIds = sedeIdsFilter.length ? sedeIdsFilter : allSedeIds;

  const { data: sesiones, loading, updateOne } = useSesiones(effectiveSedeIds);
  const equiposLookup = useEquiposLookup(effectiveSedeIds);
  const usuariosLookup = useUsuariosLookup();

  const equiposById = useMemo(() => {
    const map = new Map<string, string>();
    (equiposLookup.data ?? []).forEach((e) => map.set(e.id, e.nombre));
    return map;
  }, [equiposLookup.data]);

  const usuariosById = useMemo(() => {
    const map = new Map<string, string>();
    (usuariosLookup.data ?? []).forEach((u) =>
      map.set(u.id, u.nombre ?? u.email),
    );
    return map;
  }, [usuariosLookup.data]);

  const periodos = useMemo(() => new Set(periodosFilter), [periodosFilter]);
  const estados = useMemo(() => new Set(estadosFilter), [estadosFilter]);

  const weekDays = useMemo(() => getWeekDays(diaActivo), [diaActivo]);
  const weekRange = useMemo(() => formatWeekRange(weekDays), [weekDays]);

  const sesionesFiltradasTotal = useMemo(() => {
    if (!sesiones) return [];
    return sesiones.filter((s) => {
      if (estados.size && !estados.has(s.estado)) return false;
      if (periodos.size) {
        if (s.periodoTemporada) {
          if (!periodos.has(s.periodoTemporada)) return false;
        } else if (!periodos.has("__sin_periodo__")) return false;
      }
      return true;
    });
  }, [sesiones, estados, periodos]);

  const sesionesPorDia = useMemo(() => {
    const map = new Map<string, Sesion[]>();
    weekDays.forEach((d) => map.set(d, []));
    sesionesFiltradasTotal.forEach((s) => {
      if (map.has(s.fecha)) map.get(s.fecha)!.push(s);
    });
    map.forEach((list) =>
      list.sort((a, b) => {
        if (!a.horaInicio && b.horaInicio) return -1;
        if (a.horaInicio && !b.horaInicio) return 1;
        return (a.horaInicio ?? "").localeCompare(b.horaInicio ?? "");
      }),
    );
    return map;
  }, [sesionesFiltradasTotal, weekDays]);

  const sesionesDiaActivo = useMemo(
    () => sesionesPorDia.get(diaActivo) ?? [],
    [sesionesPorDia, diaActivo],
  );

  const sessionCountByDay = useMemo(
    () => {
      const counts = new Map<string, number>();

      sesionesFiltradasTotal.forEach((sesion) => {
        counts.set(sesion.fecha, (counts.get(sesion.fecha) ?? 0) + 1);
      });

      return counts;
    },
    [sesionesFiltradasTotal],
  );

  const sedeOptions = useMemo(
    () =>
      sedesDisponibles.map((s) => ({
        value: s.id,
        label: s.nombre,
      })),
    [sedesDisponibles],
  );

  const selectedEquipoNombre = selected
    ? equiposById.get(selected.equipoId) ?? "(equipo desconocido)"
    : "";
  const selectedEntrenadorNombre = selected
    ? selected.entrenadorIds.map((id) => usuariosById.get(id)).filter(Boolean).join(", ") || "—"
    : "";
  const selectedSedeNombre = "—";

  const handleSaveNotas = async (feedbackPostEntreno: string) => {
    if (!selected) return;
    setSavingNotas(true);
    const updated = await updateOne(selected.id, {
      fecha: selected.fecha,
      horaInicio: selected.horaInicio,
      duracionEstimada: selected.duracionEstimada,
      equipoId: selected.equipoId,
      entrenadorIds: selected.entrenadorIds,
      microciclo: selected.microciclo,
      periodoTemporada: selected.periodoTemporada,
      objetivoSesion: selected.objetivoSesion,
      observacionesPrevias: selected.observacionesPrevias,
      estado: selected.estado as EstadoSesion,
      feedbackPostEntreno,
    });
    setSavingNotas(false);
    if (updated) {
      setSelected({ ...selected, feedbackPostEntreno });
    }
  };

  // KPIs de la semana visible (derivados de los datos ya cargados, sin consultas extra).
  const resumenSemana = useMemo(() => {
    const porEstado = new Map<string, number>();
    const equipos = new Set<string>();
    let total = 0;
    weekDays.forEach((day) => {
      (sesionesPorDia.get(day) ?? []).forEach((s) => {
        total += 1;
        equipos.add(s.equipoId);
        porEstado.set(s.estado, (porEstado.get(s.estado) ?? 0) + 1);
      });
    });
    const realizadas = porEstado.get(ESTADO_SESION.REALIZADA) ?? 0;
    const planificadas = porEstado.get(ESTADO_SESION.PLANIFICADA) ?? 0;
    const noRealizadas = porEstado.get(ESTADO_SESION.NO_REALIZADA) ?? 0;
    const cerradas = realizadas + noRealizadas;
    return {
      total,
      porEstado,
      realizadas,
      planificadas,
      equiposActivos: equipos.size,
      cumplimiento: cerradas > 0 ? Math.round((realizadas / cerradas) * 100) : null,
    };
  }, [sesionesPorDia, weekDays]);

  const minutosDiaActivo = sesionesDiaActivo.reduce((acc, s) => acc + (s.duracionEstimada ?? 0), 0);

  const renderDayPreview = (day: string) => {
    const lista = sesionesPorDia.get(day) ?? [];
    if (lista.length === 0) {
      return <span className="mt-auto text-center text-[11px] text-muted-foreground/70">Libre</span>;
    }
    return (
      <>
        {lista.slice(0, MAX_PREVIEW).map((s) => (
          <span
            key={s.id}
            className="flex min-w-0 items-center gap-1.5 rounded-md bg-card/80 px-1.5 py-1 text-[11px] leading-tight ring-1 ring-inset ring-border/70"
          >
            <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", ESTADO_SESION_DOT[s.estado] ?? "bg-primary")} />
            <span className="shrink-0 font-semibold tabular-nums text-foreground">{formatHora(s.horaInicio) || "—"}</span>
            <span className="truncate text-muted-foreground">{equiposById.get(s.equipoId) ?? "(equipo)"}</span>
          </span>
        ))}
        {lista.length > MAX_PREVIEW ? (
          <span className="px-1 text-[11px] font-medium text-primary">+{lista.length - MAX_PREVIEW} más</span>
        ) : null}
      </>
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Panel de rendimiento"
        icon={LayoutDashboard}
        tone={sectionTones.dashboard}
        action={
          <div className="flex flex-wrap gap-2" aria-label="Filtros del panel">
            <MultiSelect
              options={sedeOptions}
              value={sedeIdsFilter}
              onChange={setSedeIdsFilter}
              allLabel="Sedes"
              placeholder="Sedes"
              emptyMessage="No hay sedes disponibles"
              compact
              className="max-sm:min-w-0"
            />
            <MultiSelect
              options={PERIODO_OPTIONS}
              value={periodosFilter}
              onChange={setPeriodosFilter}
              allLabel="Período"
              placeholder="Período"
              compact
              className="max-sm:min-w-0"
            />
            <MultiSelect
              options={ESTADO_OPTIONS}
              value={estadosFilter}
              onChange={setEstadosFilter}
              allLabel="Estado"
              placeholder="Estado"
              compact
              className="max-sm:min-w-0"
            />
          </div>
        }
      />

      {/* KPIs de la semana */}
      <section aria-label="Resumen de la semana" className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
        <StatCard
          label="Sesiones"
          value={resumenSemana.total}
          hint="Esta semana"
          icon={CalendarDays}
          tone={sectionTones.sesiones}
        >
          <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
            {resumenSemana.total > 0 &&
              ESTADOS_ORDEN.map((estado) => {
                const count = resumenSemana.porEstado.get(estado) ?? 0;
                if (!count) return null;
                return (
                  <span
                    key={estado}
                    className={cn("h-full", ESTADO_SESION_DOT[estado])}
                    style={{ width: `${(count / resumenSemana.total) * 100}%` }}
                    title={`${estadoSesionLabel(estado)}: ${count}`}
                  />
                );
              })}
          </div>
        </StatCard>
        <StatCard
          label="Planificadas"
          value={resumenSemana.planificadas}
          hint="Pendientes de realizar"
          icon={CalendarClock}
          tone="bg-info/10 text-info"
        />
        <StatCard
          label="Realizadas"
          value={resumenSemana.realizadas}
          hint={resumenSemana.cumplimiento === null ? "Sin sesiones cerradas" : `${resumenSemana.cumplimiento}% de cumplimiento`}
          icon={CalendarCheck2}
          tone="bg-success/10 text-success"
        />
        <StatCard
          label="Equipos activos"
          value={resumenSemana.equiposActivos}
          hint="Con sesión esta semana"
          icon={Shield}
          tone={sectionTones.equipos}
        />
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Tablero semanal */}
        <div className="min-w-0">
          <DashboardCalendarNavigator
            activeDay={diaActivo}
            weekDays={weekDays}
            weekRange={weekRange}
            sessionCountByDay={sessionCountByDay}
            onDateChange={setDiaActivo}
            renderDayPreview={renderDayPreview}
          />
        </div>

        {/* Sesiones del día seleccionado */}
        <aside className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                Sesiones{" "}
                <span className="font-normal text-muted-foreground">
                  ({sesionesDiaActivo.length})
                </span>
              </h2>
              <p className="mt-0.5 text-[12.5px] font-medium text-muted-foreground first-letter:uppercase">
                {formatFechaLarga(diaActivo)}
              </p>
            </div>
            {minutosDiaActivo > 0 && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[11.5px] font-medium text-muted-foreground tabular-nums">
                <Clock className="size-3" aria-hidden="true" />
                {minutosDiaActivo} min
              </span>
            )}
          </div>

          {loading ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Cargando…
            </p>
          ) : sesionesDiaActivo.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <span className="grid size-10 place-items-center rounded-xl bg-secondary text-muted-foreground">
                <CalendarDays className="size-5" aria-hidden="true" />
              </span>
              <p className="text-sm text-muted-foreground">Sin sesiones</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {sesionesDiaActivo.map((s) => {
                const equipo = equiposById.get(s.equipoId) ?? "(equipo)";
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(s)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <span className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-chart-2/10 py-1.5 text-chart-2">
                        <span className="text-[13px] font-semibold leading-none tabular-nums">
                          {s.horaInicio ? formatHora(s.horaInicio) : "—"}
                        </span>
                        <span className="mt-1 text-[10px] font-medium leading-none text-muted-foreground">
                          {s.duracionEstimada ? `${s.duracionEstimada}′` : "Sin hora"}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold text-foreground">
                          {equipo}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-muted-foreground">
                          {s.objetivoSesion ? (
                            <>
                              <Target className="size-3 shrink-0" aria-hidden="true" />
                              <span className="truncate">{s.objetivoSesion}</span>
                            </>
                          ) : (
                            "Sin objetivo definido"
                          )}
                        </span>
                      </span>
                      <EstadoSesionBadge estado={s.estado} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>

      <SesionDetalleDialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        sesion={selected}
        equipoNombre={selectedEquipoNombre}
        sedeNombre={selectedSedeNombre}
        entrenadorNombre={selectedEntrenadorNombre}
        savingNotas={savingNotas}
        onSaveNotas={handleSaveNotas}
      />
    </div>
  );
}
