"use client";

import { useState } from "react";
import { ChevronRight, Users, UserCheck, Loader2, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@/hooks/useQuery";
import { fetchEquipos } from "@/services/equipos.service";
import { fetchJugadoresByEquipo } from "@/services/jugadores.service";
import { fetchEntrenadoresByEquipo } from "@/services/entrenadores.service";
import { SesionesEquipoList } from "./SesionesEquipoList";
import type { Sede } from "@/types/sedes";
import type { Equipo } from "@/types/equipos";
import type { Jugador } from "@/types/jugadores";
import type { Entrenador } from "@/types/entrenadores";
import type { Sesion } from "@/types/sesiones";

interface MiembroListProps {
  equipoId: string;
  equipoNombre: string;
  open: boolean;
  onEditJugador: (j: Jugador) => void;
  onEditEntrenador: (e: Entrenador) => void;
}

function MiembroList({ equipoId, equipoNombre, open, onEditJugador, onEditEntrenador }: MiembroListProps) {
  const jugadores = useQuery<Jugador[]>(
    () => (open ? fetchJugadoresByEquipo(equipoId) : Promise.resolve({ data: null, error: null })),
    ["jugadores", "by-equipo", equipoId, open],
  );
  const entrenadores = useQuery<Entrenador[]>(
    () => (open ? fetchEntrenadoresByEquipo(equipoId) : Promise.resolve({ data: null, error: null })),
    ["entrenadores", "by-equipo", equipoId, open],
  );

  if (!open) return null;

  if (jugadores.loading || entrenadores.loading) {
    return (
      <div role="status" className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Cargando miembros...
      </div>
    );
  }

  const jugadoresList = jugadores.data ?? [];
  const entrenadoresList = entrenadores.data ?? [];
  const miembrosLabel = `Lista de miembros de ${equipoNombre}`;

  if (jugadoresList.length === 0 && entrenadoresList.length === 0) {
    return (
      <p className="px-4 py-2 text-sm text-muted-foreground italic">Sin miembros asignados</p>
    );
  }

  return (
    <div
      role="region"
      aria-label={miembrosLabel}
      tabIndex={0}
      className="max-h-56 overflow-y-auto overscroll-y-auto [scrollbar-gutter:stable] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <div className="flex flex-col gap-1 px-4 py-2">
        {entrenadoresList.map((e) => (
          <div
            key={e.id}
            className="flex min-h-11 items-center gap-2 border border-[color-mix(in_oklab,var(--primary)_24%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_8%,var(--background))] px-2 text-sm dark:border-[color-mix(in_oklab,var(--primary)_42%,var(--border))] dark:bg-[color-mix(in_oklab,var(--primary)_16%,var(--background))]"
          >
            <UserCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="font-medium flex-1">
              {e.nombre}{e.apellidos ? ` ${e.apellidos}` : ""}
            </span>
            <span className="shrink-0 border border-primary/30 px-1.5 py-0.5 text-xs font-medium text-foreground">
              Entrenador
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-11 shrink-0 p-0 focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Editar entrenador ${e.nombre}${e.apellidos ? ` ${e.apellidos}` : ""}`}
              onClick={(ev) => { ev.stopPropagation(); onEditEntrenador(e); }}
            >
              <Pencil className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        ))}
        {jugadoresList.map((j) => (
          <div key={j.id} className="flex min-h-11 items-center gap-2 border border-border bg-muted/40 px-2 text-sm">
            <Users className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="flex-1">
              {j.nombre}{j.apellidos ? ` ${j.apellidos}` : ""}
            </span>
            <span className="shrink-0 border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
              Jugador
            </span>
            {j.dorsal != null && (
              <span className="text-muted-foreground text-xs">#{j.dorsal}</span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-11 shrink-0 p-0 focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Editar jugador ${j.nombre}${j.apellidos ? ` ${j.apellidos}` : ""}`}
              onClick={(ev) => { ev.stopPropagation(); onEditJugador(j); }}
            >
              <Pencil className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

interface EquipoAccordionRowProps {
  equipo: Equipo;
  onEditEquipo: (eq: Equipo) => void;
  onEditJugador: (j: Jugador) => void;
  onEditEntrenador: (e: Entrenador) => void;
  onEditSesion: (s: Sesion) => void;
}

function EquipoAccordionRow({
  equipo,
  onEditEquipo,
  onEditJugador,
  onEditEntrenador,
  onEditSesion,
}: EquipoAccordionRowProps) {
  const [open, setOpen] = useState(false);
  const equipoControlId = `equipo-control-${equipo.id}`;
  const sesionesRegionId = `equipo-sesiones-${equipo.id}`;
  const sesionesLabelId = `equipo-sesiones-label-${equipo.id}`;
  const miembrosRegionId = `equipo-miembros-${equipo.id}`;
  const miembrosLabelId = `equipo-miembros-label-${equipo.id}`;

  return (
    <div className="border-b border-border/70 last:border-b-0">
      <div className="flex items-center bg-background">
        <button
          id={equipoControlId}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-11 flex-1 items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring min-w-0"
          aria-expanded={open}
          aria-controls={open ? `${sesionesRegionId} ${miembrosRegionId}` : undefined}
          aria-label={`${open ? "Ocultar" : "Mostrar"} contenido de ${equipo.nombre}`}
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
          className="min-h-11 shrink-0 mr-1 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Editar equipo ${equipo.nombre}`}
          onClick={(ev) => { ev.stopPropagation(); onEditEquipo(equipo); }}
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          Editar
        </Button>
      </div>

      {open && (
        <div className="grid border-t border-border/70 bg-muted/20 md:grid-cols-2">
          <section id={sesionesRegionId} aria-labelledby={sesionesLabelId} className="min-w-0 p-3">
            <h3 id={sesionesLabelId} className="mb-1 text-xs font-semibold text-muted-foreground">
              Sesiones de {equipo.nombre}
            </h3>
            <SesionesEquipoList
              equipoId={equipo.id}
              equipoNombre={equipo.nombre}
              open={open}
              onEditSesion={onEditSesion}
            />
          </section>
          <section id={miembrosRegionId} aria-labelledby={miembrosLabelId} className="min-w-0 border-t border-border/70 p-3 md:border-l md:border-t-0">
            <h3 id={miembrosLabelId} className="mb-1 text-xs font-semibold text-muted-foreground">
              Miembros de {equipo.nombre}
            </h3>
            <MiembroList
              equipoId={equipo.id}
              equipoNombre={equipo.nombre}
              open={open}
              onEditJugador={onEditJugador}
              onEditEntrenador={onEditEntrenador}
            />
          </section>
        </div>
      )}
    </div>
  );
}

interface EquiposListProps {
  sedeId: string;
  open: boolean;
  onEditEquipo: (eq: Equipo) => void;
  onEditJugador: (j: Jugador) => void;
  onEditEntrenador: (e: Entrenador) => void;
  onEditSesion: (s: Sesion) => void;
}

function EquiposList({ sedeId, open, onEditEquipo, onEditJugador, onEditEntrenador, onEditSesion }: EquiposListProps) {
  const { data, loading } = useQuery<Equipo[]>(
    () => (open ? fetchEquipos(sedeId) : Promise.resolve({ data: null, error: null })),
    ["equipos", "accordion", sedeId, open],
  );

  if (!open) return null;

  if (loading) {
    return (
      <div role="status" className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
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
          onEditSesion={onEditSesion}
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
  onEditSesion: (s: Sesion) => void;
}

export function SedeAccordionRow({
  sede,
  actions,
  onEditEquipo,
  onEditJugador,
  onEditEntrenador,
  onEditSesion,
}: SedeAccordionRowProps) {
  const [open, setOpen] = useState(false);
  const sedeControlId = `sede-control-${sede.id}`;
  const sedeLabel = `Sede ${sede.nombre}`;
  const equiposRegionId = `sede-equipos-${sede.id}`;
  const equiposLabelId = `sede-equipos-label-${sede.id}`;

  return (
    <section aria-label={sedeLabel} className="border-b border-border bg-card last:border-b-0">
      <header className={`flex items-center gap-3 bg-card px-4 py-3 transition-colors hover:bg-muted/30 ${open ? "border-b border-border/70" : ""}`}>
        <h2 className="sr-only">{sedeLabel}</h2>
        <button
          id={sedeControlId}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-11 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring min-w-0"
          aria-expanded={open}
          aria-controls={open ? equiposRegionId : undefined}
          aria-label={`${open ? "Ocultar" : "Mostrar"} equipos de ${sede.nombre}`}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-border bg-secondary text-foreground" aria-hidden="true">
            <MapPin className="size-4" />
          </span>
          <ChevronRight
            className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          />
          <span className="font-semibold tracking-[-0.01em] truncate">{sede.nombre}</span>
          {sede.direccion && (
            <span className="hidden text-xs text-muted-foreground sm:inline truncate">
              {sede.direccion}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      </header>

      {open && (
        <section
          id={equiposRegionId}
          aria-labelledby={equiposLabelId}
          tabIndex={0}
          className="ml-4 max-h-[32rem] overflow-y-auto overscroll-y-auto [scrollbar-gutter:stable] border-l border-border bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <h2 id={equiposLabelId} className="px-3 pt-3 text-xs font-semibold text-muted-foreground">
            Equipos de {sede.nombre}
          </h2>
          <EquiposList
            sedeId={sede.id}
            open={open}
            onEditEquipo={onEditEquipo}
            onEditJugador={onEditJugador}
            onEditEntrenador={onEditEntrenador}
            onEditSesion={onEditSesion}
          />
        </section>
      )}
    </section>
  );
}
