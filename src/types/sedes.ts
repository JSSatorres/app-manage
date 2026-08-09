import type { Json } from "@/types/database.types";

export interface Sede {
  id: string;
  nombre: string;
  direccion: string | null;
  configuracionVisual: Json;
  responsableId: string | null;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SedeCreateInput {
  nombre: string;
  direccion: string | null;
  workspaceId: string;
}

export interface SedeUpdateInput {
  nombre: string;
  direccion: string | null;
}

export interface CloneSedeSelection {
  equipos: string[];
  entrenadores: string[];
  jugadores: string[];
  sesiones: string[];
  parametros: string[];
  documentos: string[];
}

export type CloneSedeCategory = keyof CloneSedeSelection;

export interface CloneableSedeOption {
  id: string;
  label: string;
}

export interface CloneableEquipoOption extends CloneableSedeOption {
  categoria: string | null;
}

export interface CloneableSesionOption extends CloneableSedeOption {
  equipoId: string;
  trainerIds: string[];
}

export interface CloneablePersonEquipoRelation {
  personId: string;
  equipoId: string;
}

export interface CloneableParametroOption extends CloneableSedeOption {
  categoria: string;
}

export interface CloneableSedeContent {
  equipos: CloneableEquipoOption[];
  entrenadores: CloneableSedeOption[];
  jugadores: CloneableSedeOption[];
  sesiones: CloneableSesionOption[];
  entrenadorEquipos?: CloneablePersonEquipoRelation[];
  jugadorEquipos?: CloneablePersonEquipoRelation[];
  parametros: CloneableParametroOption[];
  documentos: CloneableSedeOption[];
}

export interface CloneSedeInput {
  workspaceId: string;
  sourceSedeId: string;
  nombre: string;
  direccion: string | null;
  seleccion: CloneSedeSelection;
}

export interface CloneSedeMappings {
  equipos: Record<string, string>;
  sesiones: Record<string, string>;
}

export interface CloneSedeSummary {
  equipos: number;
  entrenadores: number;
  jugadores: number;
  sesiones: number;
  parametros: number;
  documentos: number;
  ejercicios: number;
}

export type CloneSedeOmissionCode =
  | "entrenador_equipo_no_seleccionado"
  | "jugador_equipo_no_seleccionado"
  | "sesion_equipo_no_seleccionado";

export interface CloneSedeOmission {
  code: CloneSedeOmissionCode;
  entityId: string;
  entityLabel: string;
  relatedId: string;
  relatedLabel: string;
  detail: string;
}

export interface CloneSedeOmissionSummary extends Record<CloneSedeOmissionCode, number> {
  total: number;
}

export interface CloneSedePreflight {
  effectiveSelection: CloneSedeSelection;
  omissions: CloneSedeOmission[];
  omissionSummary: CloneSedeOmissionSummary;
}

export interface CloneSedeResult {
  sede: {
    id: string;
    nombre: string;
    direccion: string | null;
    responsable_id: string | null;
    configuracion_visual: Json;
    workspace_id: string;
  };
  mappings: CloneSedeMappings;
  resumen: CloneSedeSummary;
  omisiones?: CloneSedeOmissionSummary;
}

export type CloneSedeResponse = CloneSedeResult;
