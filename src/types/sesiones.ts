import type { EstadoSesion, PeriodoTemporada } from "@/lib/constants";

export interface Sesion {
  id: string;
  fecha: string;
  horaInicio: string | null;
  duracionEstimada: number | null;
  equipoId: string;
  /** Entrenadores asignados a la sesión (tabla pivote sesion_entrenadores). */
  entrenadorIds: string[];
  microciclo: number | null;
  periodoTemporada: PeriodoTemporada | null;
  objetivoSesion: string | null;
  observacionesPrevias: string | null;
  feedbackPostEntreno: string | null;
  estado: EstadoSesion;
  createdAt: string;
  updatedAt: string;
}

export interface SesionCreateInput {
  fecha: string;
  horaInicio: string | null;
  duracionEstimada: number | null;
  equipoId: string;
  entrenadorIds: string[];
  microciclo: number | null;
  periodoTemporada: PeriodoTemporada | null;
  objetivoSesion: string | null;
  observacionesPrevias: string | null;
  estado: EstadoSesion;
}

export interface SesionUpdateInput extends SesionCreateInput {
  feedbackPostEntreno: string | null;
}

