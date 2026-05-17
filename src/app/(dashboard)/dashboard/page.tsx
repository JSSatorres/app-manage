"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
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

function estadoLabel(estado: string): string {
  return estado === ESTADO_SESION.NO_REALIZADA ? "No realizada" : estado;
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftISODate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
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
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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

  const sesionesFiltradas = useMemo(() => {
    if (!sesiones) return [];
    return sesiones
      .filter((s) => {
        if (s.fecha !== diaActivo) return false;
        if (estados.size && !estados.has(s.estado)) return false;
        if (periodos.size) {
          if (s.periodoTemporada) {
            if (!periodos.has(s.periodoTemporada)) return false;
          } else if (!periodos.has("__sin_periodo__")) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Sin hora arriba; resto por hora descendente.
        if (!a.horaInicio && b.horaInicio) return -1;
        if (a.horaInicio && !b.horaInicio) return 1;
        if (!a.horaInicio && !b.horaInicio) return 0;
        return (b.horaInicio ?? "").localeCompare(a.horaInicio ?? "");
      });
  }, [sesiones, estados, periodos, diaActivo]);

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
    ? usuariosById.get(selected.entrenadorId) ?? "—"
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

      <div className="bg-white rounded-xl border border-border/60 shadow-sm flex flex-col">
        <div className="p-5 pb-3 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Sesiones{" "}
              <span className="text-xs font-normal text-muted-foreground">
                ({sesionesFiltradas.length})
              </span>
            </h2>
            <p className="text-xs text-muted-foreground capitalize">
              {formatFechaLarga(diaActivo)}
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-background p-0.5">
            <button
              type="button"
              onClick={() => setDiaActivo(shiftISODate(diaActivo, -1))}
              className="size-7 rounded-md hover:bg-muted/60 flex items-center justify-center text-muted-foreground transition-colors"
              aria-label="Día anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setDiaActivo(todayISO())}
              className={cn(
                "h-7 px-2 rounded-md text-xs font-medium transition-colors",
                diaActivo === todayISO()
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted/60 text-foreground",
              )}
            >
              Hoy
            </button>
            <div className="relative h-7">
              <label
                htmlFor="dia-picker"
                className="h-7 px-2 rounded-md hover:bg-muted/60 text-foreground text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <CalendarIcon size={14} />
                {formatFechaCorta(diaActivo)}
              </label>
              <input
                id="dia-picker"
                type="date"
                value={diaActivo}
                onChange={(e) => {
                  if (e.target.value) setDiaActivo(e.target.value);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            <button
              type="button"
              onClick={() => setDiaActivo(shiftISODate(diaActivo, 1))}
              className="size-7 rounded-md hover:bg-muted/60 flex items-center justify-center text-muted-foreground transition-colors"
              aria-label="Día siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="px-5 pb-5">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Cargando…
            </p>
          ) : sesionesFiltradas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Sin sesiones
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {sesionesFiltradas.map((s) => {
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
