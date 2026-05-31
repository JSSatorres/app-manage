"use client";

import { Loader2, Calendar } from "lucide-react";
import { useQuery } from "@/hooks/useQuery";
import { fetchSesionesByEquipoId } from "@/services/sesiones.service";
import { ESTADO_SESION } from "@/lib/constants";
import type { Sesion } from "@/types/sesiones";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;

const ESTADO_STYLES: Record<string, string> = {
  [ESTADO_SESION.BORRADOR]:     "bg-gray-100 text-gray-600",
  [ESTADO_SESION.PLANIFICADA]:  "bg-blue-100 text-blue-700",
  [ESTADO_SESION.REALIZADA]:    "bg-green-100 text-green-700",
  [ESTADO_SESION.NO_REALIZADA]: "bg-red-100 text-red-600",
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
  const estadoClass = ESTADO_STYLES[sesion.estado] ?? "bg-gray-100 text-gray-600";

  return (
    <button
      type="button"
      onClick={() => onEdit(sesion)}
      className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-muted/60 transition-colors text-left group"
      title={sesion.objetivoSesion ?? sesion.fecha}
    >
      <span className="font-semibold text-muted-foreground w-6 shrink-0">{dia}</span>
      <span>{fecha}</span>
      {hora && <span className="text-muted-foreground">{hora}</span>}
      {sesion.duracionEstimada && (
        <span className="text-muted-foreground">{sesion.duracionEstimada}′</span>
      )}
      <span className={`rounded px-1 py-0.5 font-medium ${estadoClass}`}>
        {sesion.estado === ESTADO_SESION.NO_REALIZADA ? "No realizada" : sesion.estado}
      </span>
    </button>
  );
}

interface SesionesEquipoListProps {
  equipoId: string;
  open: boolean;
  onEditSesion: (s: Sesion) => void;
}

export function SesionesEquipoList({ equipoId, open, onEditSesion }: SesionesEquipoListProps) {
  const { data, loading } = useQuery<Sesion[]>(
    () =>
      open
        ? fetchSesionesByEquipoId(equipoId)
        : Promise.resolve({ data: null, error: null }),
    ["sesiones", "by-equipo", equipoId, open],
  );

  if (!open) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Cargando sesiones...
      </div>
    );
  }

  const sesiones = data ?? [];

  if (sesiones.length === 0) {
    return (
      <div className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-muted-foreground italic">
        <Calendar className="size-3" />
        Sin sesiones
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-2">
      {sesiones.map((s) => (
        <SesionChip key={s.id} sesion={s} onEdit={onEditSesion} />
      ))}
    </div>
  );
}
