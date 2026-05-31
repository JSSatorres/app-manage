"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from "lucide-react";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import { useSesiones } from "@/hooks/useSesiones";
import { useEquiposLookup } from "@/hooks/useEquiposLookup";
import { useUsuariosLookup } from "@/hooks/useUsuariosLookup";
import { ESTADO_SESION, PERIODO_TEMPORADA, type EstadoSesion } from "@/lib/constants";
import { MultiSelect } from "@/components/shared/MultiSelect";
import { SesionDetalleDialog } from "@/components/sesiones/SesionDetalleDialog";
import type { Sesion } from "@/types/sesiones";
import { cn } from "@/lib/utils";

const ESTADO_STYLE: Record<string, string> = {
  Realizada: "bg-emerald-100 text-emerald-700",
  Planificada: "bg-blue-100 text-blue-700",
  Borrador: "bg-amber-100 text-amber-700",
  NoRealizada: "bg-rose-100 text-rose-700",
};

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

const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];
const DIAS_SEMANA_CORTO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function estadoLabel(estado: string): string {
  return estado === ESTADO_SESION.NO_REALIZADA ? "No realizada" : estado;
}

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

function shiftISODate(iso: string, days: number): string {
  const date = parseISO(iso);
  date.setDate(date.getDate() + days);
  return toISO(date);
}

function formatHora(hora: string | null): string {
  if (!hora) return "";
  return hora.slice(0, 5);
}

function formatFechaCorta(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
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

/** Primer día del mes */
function getFirstOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

interface MiniCalendarProps {
  activeDay: string;
  onSelectDay: (iso: string) => void;
  sesiones: Sesion[];
}

function MiniCalendar({ activeDay, onSelectDay, sesiones }: MiniCalendarProps) {
  const today = todayISO();
  const activeParsed = parseISO(activeDay);
  const [viewYear, setViewYear] = useState(activeParsed.getFullYear());
  const [viewMonth, setViewMonth] = useState(activeParsed.getMonth());

  const daysInMonth = useMemo(() => {
    const first = getFirstOfMonth(viewYear, viewMonth);
    const firstDow = first.getDay(); // 0=Dom
    const offset = firstDow === 0 ? 6 : firstDow - 1; // Lunes=0
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (string | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= totalDays; d++) {
      cells.push(toISO(new Date(viewYear, viewMonth, d)));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const sessionDays = useMemo(() => {
    const set = new Set<string>();
    sesiones.forEach((s) => set.add(s.fecha));
    return set;
  }, [sesiones]);

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  return (
    <div className="bg-white rounded-xl border border-border/60 shadow-sm p-4 select-none">
      {/* Cabecera mes */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="size-7 rounded-md hover:bg-muted/60 flex items-center justify-center text-muted-foreground transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-semibold capitalize text-foreground">
          {monthName}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="size-7 rounded-md hover:bg-muted/60 flex items-center justify-center text-muted-foreground transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Cabecera días */}
      <div className="grid grid-cols-7 mb-1">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Celdas */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {daysInMonth.map((iso, i) => {
          if (!iso) return <div key={i} />;
          const isToday = iso === today;
          const isActive = iso === activeDay;
          const hasSessions = sessionDays.has(iso);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDay(iso)}
              className={cn(
                "relative h-7 w-full rounded-md text-xs font-medium transition-colors flex items-center justify-center",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isToday
                  ? "bg-primary/15 text-primary font-bold"
                  : "hover:bg-muted/60 text-foreground",
              )}
            >
              {iso.split("-")[2]?.replace(/^0/, "")}
              {hasSessions && !isActive && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-primary opacity-70" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { sedesDisponibles } = useWorkspaceContext();

  const [sedeIdsFilter, setSedeIdsFilter] = useState<string[]>([]);
  const [periodosFilter, setPeriodosFilter] = useState<string[]>([]);
  const [estadosFilter, setEstadosFilter] = useState<string[]>([]);
  const [selected, setSelected] = useState<Sesion | null>(null);
  const [savingNotas, setSavingNotas] = useState(false);
  const [diaActivo, setDiaActivo] = useState<string>(() => todayISO());
  const [showCalendar, setShowCalendar] = useState(false);

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
  const today = todayISO();

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
      entrenadorId: selected.entrenadorId,
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

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Panel de rendimiento
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sesiones del club ordenadas por fecha y hora
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <MultiSelect
            options={sedeOptions}
            value={sedeIdsFilter}
            onChange={setSedeIdsFilter}
            allLabel="Sedes"
            placeholder="Sedes"
            emptyMessage="No hay sedes disponibles"
            compact
          />
          <MultiSelect
            options={PERIODO_OPTIONS}
            value={periodosFilter}
            onChange={setPeriodosFilter}
            allLabel="Período"
            placeholder="Período"
            compact
          />
          <MultiSelect
            options={ESTADO_OPTIONS}
            value={estadosFilter}
            onChange={setEstadosFilter}
            allLabel="Estado"
            placeholder="Estado"
            compact
          />
        </div>
      </div>

      <div className="flex gap-4 items-start">
        {/* Columna principal */}
        <div className="flex-1 min-w-0 bg-white rounded-xl border border-border/60 shadow-sm flex flex-col">
          {/* Navegación semana */}
          <div className="p-5 pb-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDiaActivo(shiftISODate(diaActivo, -7))}
                className="size-8 rounded-md hover:bg-muted/60 flex items-center justify-center text-muted-foreground transition-colors border border-border/60"
                aria-label="Semana anterior"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="text-sm font-semibold text-foreground min-w-[170px] text-center">
                {weekRange}
              </span>

              <button
                type="button"
                onClick={() => setDiaActivo(shiftISODate(diaActivo, 7))}
                className="size-8 rounded-md hover:bg-muted/60 flex items-center justify-center text-muted-foreground transition-colors border border-border/60"
                aria-label="Semana siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDiaActivo(today)}
                className={cn(
                  "h-7 px-3 rounded-md text-xs font-medium transition-colors border",
                  weekDays.includes(today)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/60 hover:bg-muted/60 text-foreground",
                )}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setShowCalendar((v) => !v)}
                className={cn(
                  "size-7 rounded-md flex items-center justify-center transition-colors border",
                  showCalendar
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/60 hover:bg-muted/60 text-muted-foreground",
                )}
                aria-label="Ver calendario mensual"
              >
                <CalendarIcon size={14} />
              </button>
            </div>
          </div>

          {/* Selector días de la semana */}
          <div className="px-5 pb-3">
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((iso, i) => {
                const count = sesionesPorDia.get(iso)?.length ?? 0;
                const isActive = iso === diaActivo;
                const isToday = iso === today;
                const dayNum = iso.split("-")[2]?.replace(/^0/, "");
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setDiaActivo(iso)}
                    className={cn(
                      "flex flex-col items-center py-2 px-1 rounded-lg transition-colors relative",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isToday
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/60 text-foreground",
                    )}
                  >
                    <span className="text-[10px] font-medium opacity-70">
                      {DIAS_SEMANA_CORTO[i]}
                    </span>
                    <span className={cn("text-sm font-bold leading-tight", isToday && !isActive && "text-primary")}>
                      {dayNum}
                    </span>
                    {count > 0 && (
                      <span
                        className={cn(
                          "mt-0.5 text-[9px] font-semibold rounded-full size-4 flex items-center justify-center",
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-primary/15 text-primary",
                        )}
                      >
                        {count}
                      </span>
                    )}
                    {count === 0 && <span className="mt-0.5 size-4" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border/40 mx-5" />

          {/* Cabecera día activo */}
          <div className="px-5 pt-3 pb-1">
            <h2 className="text-base font-bold text-foreground">
              Sesiones{" "}
              <span className="text-xs font-normal text-muted-foreground">
                ({sesionesDiaActivo.length})
              </span>
            </h2>
            <p className="text-xs text-muted-foreground capitalize">
              {formatFechaLarga(diaActivo)}
            </p>
          </div>

          {/* Lista de sesiones */}
          <div className="px-5 pb-5 pt-2">
            {loading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Cargando…
              </p>
            ) : sesionesDiaActivo.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Sin sesiones
              </p>
            ) : (
              <ul className="divide-y divide-border/40">
                {sesionesDiaActivo.map((s) => {
                  const equipo = equiposById.get(s.equipoId) ?? "(equipo)";
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(s)}
                        className="w-full flex items-center justify-between py-3 text-left hover:bg-muted/30 -mx-2 px-2 rounded-md transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <CalendarDays size={16} className="text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {equipo}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {s.horaInicio ? formatHora(s.horaInicio) : "Sin hora"}
                              {" · "}
                              {formatFechaCorta(s.fecha)}
                              {s.objetivoSesion ? ` · ${s.objetivoSesion}` : ""}
                            </p>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "text-xs font-semibold px-2.5 py-1 rounded-full shrink-0",
                            ESTADO_STYLE[s.estado] ?? "bg-gray-100 text-gray-700",
                          )}
                        >
                          {estadoLabel(s.estado)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Mini calendario mensual */}
        {showCalendar && (
          <div className="w-[220px] shrink-0 relative">
            <button
              type="button"
              onClick={() => setShowCalendar(false)}
              className="absolute -top-2 -right-2 z-10 size-5 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground transition-colors"
              aria-label="Cerrar calendario"
            >
              <X size={10} />
            </button>
            <MiniCalendar
              activeDay={diaActivo}
              onSelectDay={(iso) => {
                setDiaActivo(iso);
              }}
              sesiones={sesionesFiltradasTotal}
            />
          </div>
        )}
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
