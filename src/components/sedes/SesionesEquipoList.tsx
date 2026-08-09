"use client";

import { Loader2, Calendar } from "lucide-react";
import { useQuery } from "@/hooks/useQuery";
import { fetchSesionesByEquipoId } from "@/services/sesiones.service";
import { ESTADO_SESION } from "@/lib/constants";
import type { Sesion } from "@/types/sesiones";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;

const ESTADO_STYLES: Record<string, string> = {
  [ESTADO_SESION.BORRADOR]:
    "border-border bg-secondary text-foreground dark:border-[color-mix(in_oklab,var(--border)_78%,var(--foreground))] dark:bg-[color-mix(in_oklab,var(--secondary)_82%,var(--background))]",
  [ESTADO_SESION.PLANIFICADA]:
    "border-[color-mix(in_oklab,var(--primary)_45%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_12%,var(--background))] text-foreground dark:border-[color-mix(in_oklab,var(--primary)_62%,var(--border))] dark:bg-[color-mix(in_oklab,var(--primary)_24%,var(--background))]",
  [ESTADO_SESION.REALIZADA]:
    "border-[color-mix(in_oklab,#16803c_42%,var(--border))] bg-[color-mix(in_oklab,#16803c_12%,var(--background))] text-foreground dark:border-[color-mix(in_oklab,#52b96a_58%,var(--border))] dark:bg-[color-mix(in_oklab,#52b96a_24%,var(--background))]",
  [ESTADO_SESION.NO_REALIZADA]:
    "border-[color-mix(in_oklab,var(--destructive)_48%,var(--border))] bg-[color-mix(in_oklab,var(--destructive)_12%,var(--background))] text-foreground dark:border-[color-mix(in_oklab,var(--destructive)_64%,var(--border))] dark:bg-[color-mix(in_oklab,var(--destructive)_25%,var(--background))]",
};

function formatFecha(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const dia = DIAS[d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return { dia, fecha: `${dd}/${mm}` };
}

function formatHora(h: string | null) {
  if (!h) return null;
  return h.slice(0, 5);
}

interface SesionChipProps {
  sesion: Sesion;
  onEdit: (s: Sesion) => void;
}

function SesionChip({ sesion, onEdit }: SesionChipProps) {
  const { dia, fecha } = formatFecha(sesion.fecha);
  const hora = formatHora(sesion.horaInicio);
  const estado = sesion.estado === ESTADO_SESION.NO_REALIZADA ? "No realizada" : sesion.estado;
  const estadoClass = ESTADO_STYLES[sesion.estado] ?? "border-border bg-secondary text-foreground";

  return (
    <button
      type="button"
      onClick={() => onEdit(sesion)}
      aria-label={`Editar sesión del ${fecha}`}
      className="flex min-h-11 flex-wrap items-center gap-x-1.5 gap-y-1 rounded-md border border-border bg-background px-2 py-1 text-left text-xs transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title={sesion.objetivoSesion ?? sesion.fecha}
    >
      <span className="w-6 shrink-0 font-semibold text-muted-foreground">{dia}</span>
      <span className="font-medium text-foreground">{fecha}</span>
      {hora && <span className="text-muted-foreground">{hora}</span>}
      {sesion.duracionEstimada && (
        <span className="text-muted-foreground">{sesion.duracionEstimada}′</span>
      )}
      <span
        aria-label={`Estado: ${estado}`}
        className={`rounded-full border px-1.5 py-0.5 font-medium ${estadoClass}`}
      >
        {estado}
      </span>
    </button>
  );
}

interface SesionesEquipoListProps {
  equipoId: string;
  equipoNombre?: string;
  open: boolean;
  onEditSesion: (s: Sesion) => void;
}

export function SesionesEquipoList({ equipoId, equipoNombre, open, onEditSesion }: SesionesEquipoListProps) {
  const { data, loading } = useQuery<Sesion[]>(
    () =>
      open
        ? fetchSesionesByEquipoId(equipoId)
        : Promise.resolve({ data: null, error: null }),
    ["sesiones", "by-equipo", equipoId, open],
  );
  const sesionesLabel = equipoNombre ? `Lista de sesiones de ${equipoNombre}` : "Sesiones";

  if (!open) return null;

  if (loading) {
    return (
      <div
        role="region"
        aria-label={sesionesLabel}
        tabIndex={0}
        className="max-h-56 overflow-y-auto overscroll-y-auto [scrollbar-gutter:stable] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div role="status" className="flex items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Cargando sesiones...
        </div>
      </div>
    );
  }

  const sesiones = data ?? [];

  if (sesiones.length === 0) {
    return (
      <div
        role="region"
        aria-label={sesionesLabel}
        aria-live="polite"
        tabIndex={0}
        className="flex max-h-56 items-center gap-1.5 overflow-y-auto overscroll-y-auto px-4 py-1.5 text-xs italic text-muted-foreground [scrollbar-gutter:stable] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <Calendar className="size-3" />
        Sin sesiones
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label={sesionesLabel}
      tabIndex={0}
      className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto overscroll-y-auto px-4 py-2 [scrollbar-gutter:stable] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      {sesiones.map((s) => (
        <SesionChip key={s.id} sesion={s} onEdit={onEditSesion} />
      ))}
    </div>
  );
}
