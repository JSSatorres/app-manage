"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { DashboardCalendarNavigator } from "@/components/dashboard/DashboardCalendarNavigator";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import { useSesiones } from "@/hooks/useSesiones";
import { useEquiposLookup } from "@/hooks/useEquiposLookup";
import { useUsuariosLookup } from "@/hooks/useUsuariosLookup";
import { ESTADO_SESION, PERIODO_TEMPORADA, type EstadoSesion } from "@/lib/constants";
import { MultiSelect } from "@/components/shared/MultiSelect";
import { PageHeader } from "@/components/shared/PageHeader";
import { SesionDetalleDialog } from "@/components/sesiones/SesionDetalleDialog";
import type { Sesion } from "@/types/sesiones";
import { cn } from "@/lib/utils";

const ESTADO_STYLE: Record<string, string> = {
  Realizada: "bg-background/10 text-background",
  Planificada: "bg-background/10 text-background",
  Borrador: "bg-background/10 text-background",
  NoRealizada: "bg-background/10 text-background",
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

  return (
    <div className="space-y-5">
      <section>
        <PageHeader
          title="Panel de rendimiento"
        />

        <div className="-mt-4 flex flex-wrap gap-2" aria-label="Filtros del panel">
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
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.85fr)]">
        {/* Columna principal */}
        <div className="min-w-0 border-t-2 border-foreground">
          <DashboardCalendarNavigator
            activeDay={diaActivo}
            weekDays={weekDays}
            weekRange={weekRange}
            sessionCountByDay={sessionCountByDay}
            onDateChange={setDiaActivo}
          />
        </div>

        <aside className="border-t-2 border-foreground bg-foreground p-5 text-background">

          {/* Cabecera día activo */}
          <div className="border-b border-background/20 pb-4">
            <h2 className="font-serif text-2xl font-semibold tracking-[-0.04em] text-background">
              Sesiones{" "}
              <span className="text-sm font-normal text-background/65">
                ({sesionesDiaActivo.length})
              </span>
            </h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-background/65 capitalize">
              {formatFechaLarga(diaActivo)}
            </p>
          </div>

          {/* Lista de sesiones */}
          <div className="pt-3">
            {loading ? (
              <p className="py-8 text-center text-sm text-background/65">
                Cargando…
              </p>
            ) : sesionesDiaActivo.length === 0 ? (
              <p className="py-8 text-center text-sm text-background/65">
                Sin sesiones
              </p>
            ) : (
              <ul className="divide-y divide-background/15">
                {sesionesDiaActivo.map((s) => {
                  const equipo = equiposById.get(s.equipoId) ?? "(equipo)";
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(s)}
                        className="-mx-2 flex w-full items-center justify-between rounded-md px-2 py-3 text-left transition-colors hover:bg-background/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background/10">
                            <CalendarDays size={16} className="text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-background">
                              {equipo}
                            </p>
                            <p className="text-xs text-background/65">
                              {s.horaInicio ? formatHora(s.horaInicio) : "Sin hora"}
                              {" · "}
                              {formatFechaCorta(s.fecha)}
                              {s.objetivoSesion ? ` · ${s.objetivoSesion}` : ""}
                            </p>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full bg-background/10 px-2.5 py-1 text-xs font-semibold text-background",
                            ESTADO_STYLE[s.estado] ?? "bg-background/10 text-background",
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
