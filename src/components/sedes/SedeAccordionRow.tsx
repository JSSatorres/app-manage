"use client";

import { useState } from "react";
import { ChevronRight, Users, UserCheck, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@/hooks/useQuery";
import { fetchEquipos } from "@/services/equipos.service";
import { fetchJugadoresByEquipo } from "@/services/jugadores.service";
import { fetchEntrenadoresByEquipo } from "@/services/entrenadores.service";
import type { Sede } from "@/types/sedes";
import type { Equipo } from "@/types/equipos";
import type { Jugador } from "@/types/jugadores";
import type { Entrenador } from "@/types/entrenadores";

interface MiembroListProps {
  equipoId: string;
  open: boolean;
  onEditJugador: (j: Jugador) => void;
  onEditEntrenador: (e: Entrenador) => void;
}

function MiembroList({ equipoId, open, onEditJugador, onEditEntrenador }: MiembroListProps) {
  const jugadores = useQuery<Jugador[]>(
    () => (open ? fetchJugadoresByEquipo(equipoId) : Promise.resolve({ data: null, error: null })),
    [equipoId, open],
  );
  const entrenadores = useQuery<Entrenador[]>(
    () => (open ? fetchEntrenadoresByEquipo(equipoId) : Promise.resolve({ data: null, error: null })),
    [equipoId, open],
  );

  if (!open) return null;

  if (jugadores.loading || entrenadores.loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Cargando miembros...
      </div>
    );
  }

  const jugadoresList = jugadores.data ?? [];
  const entrenadoresList = entrenadores.data ?? [];

  if (jugadoresList.length === 0 && entrenadoresList.length === 0) {
    return (
      <p className="px-4 py-2 text-sm text-muted-foreground italic">Sin miembros asignados</p>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 px-4 py-1">
      {entrenadoresList.map((e) => (
        <div key={e.id} className="flex items-center gap-2 text-sm py-0.5 group">
          <UserCheck className="size-3.5 text-blue-500 shrink-0" />
          <span className="font-medium flex-1">
            {e.nombre}{e.apellidos ? ` ${e.apellidos}` : ""}
          </span>
          <span className="text-muted-foreground text-xs">Entrenador</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(ev) => { ev.stopPropagation(); onEditEntrenador(e); }}
          >
            <Pencil className="size-3" />
          </Button>
        </div>
      ))}
      {jugadoresList.map((j) => (
        <div key={j.id} className="flex items-center gap-2 text-sm py-0.5 group">
          <Users className="size-3.5 text-green-500 shrink-0" />
          <span className="flex-1">
            {j.nombre}{j.apellidos ? ` ${j.apellidos}` : ""}
          </span>
          {j.dorsal != null && (
            <span className="text-muted-foreground text-xs">#{j.dorsal}</span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(ev) => { ev.stopPropagation(); onEditJugador(j); }}
          >
            <Pencil className="size-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}

interface EquipoAccordionRowProps {
  equipo: Equipo;
  onEditEquipo: (eq: Equipo) => void;
  onEditJugador: (j: Jugador) => void;
  onEditEntrenador: (e: Entrenador) => void;
}

function EquipoAccordionRow({
  equipo,
  onEditEquipo,
  onEditJugador,
  onEditEntrenador,
}: EquipoAccordionRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b last:border-b-0">
      <div className="flex items-center group">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left min-w-0"
        >
          <ChevronRight
            className={`size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          />
          <span className="font-medium truncate">{equipo.nombre}</span>
          {equipo.categoria && (
            <span className="ml-1 text-xs text-muted-foreground shrink-0">({equipo.categoria})</span>
          )}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 mr-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(ev) => { ev.stopPropagation(); onEditEquipo(equipo); }}
        >
          <Pencil className="size-3.5 mr-1" />
          Editar
        </Button>
      </div>
      <MiembroList
        equipoId={equipo.id}
        open={open}
        onEditJugador={onEditJugador}
        onEditEntrenador={onEditEntrenador}
      />
    </div>
  );
}

interface EquiposListProps {
  sedeId: string;
  open: boolean;
  onEditEquipo: (eq: Equipo) => void;
  onEditJugador: (j: Jugador) => void;
  onEditEntrenador: (e: Entrenador) => void;
}

function EquiposList({ sedeId, open, onEditEquipo, onEditJugador, onEditEntrenador }: EquiposListProps) {
  const { data, loading } = useQuery<Equipo[]>(
    () => (open ? fetchEquipos(sedeId) : Promise.resolve({ data: null, error: null })),
    [sedeId, open],
  );

  if (!open) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Cargando equipos...
      </div>
    );
  }

  const equipos = data ?? [];
  if (equipos.length === 0) {
    return (
      <p className="px-3 py-2 text-sm text-muted-foreground italic">Sin equipos en esta sede</p>
    );
  }

  return (
    <div className="divide-y divide-border/60">
      {equipos.map((eq) => (
        <EquipoAccordionRow
          key={eq.id}
          equipo={eq}
          onEditEquipo={onEditEquipo}
          onEditJugador={onEditJugador}
          onEditEntrenador={onEditEntrenador}
        />
      ))}
    </div>
  );
}

export interface SedeAccordionRowProps {
  sede: Sede;
  actions: React.ReactNode;
  onEditEquipo: (eq: Equipo) => void;
  onEditJugador: (j: Jugador) => void;
  onEditEntrenador: (e: Entrenador) => void;
}

export function SedeAccordionRow({
  sede,
  actions,
  onEditEquipo,
  onEditJugador,
  onEditEntrenador,
}: SedeAccordionRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b last:border-b-0">
      <div className="flex items-center gap-2 px-4 py-3 hover:bg-muted/30 transition-colors">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left min-w-0"
          aria-expanded={open}
        >
          <ChevronRight
            className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          />
          <span className="font-medium truncate">{sede.nombre}</span>
          {sede.direccion && (
            <span className="hidden sm:inline text-sm text-muted-foreground truncate">
              {sede.direccion}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      </div>

      {open && (
        <div className="ml-6 border-l border-border/60 bg-muted/20">
          <EquiposList
            sedeId={sede.id}
            open={open}
            onEditEquipo={onEditEquipo}
            onEditJugador={onEditJugador}
            onEditEntrenador={onEditEntrenador}
          />
        </div>
      )}
    </div>
  );
}
