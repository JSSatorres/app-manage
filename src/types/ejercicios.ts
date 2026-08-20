export interface Ejercicio {
  id: string;
  titulo: string;
  objetivoPrincipal: string | null;
  numeroJugadoresMin: number | null;
  sedePropietariaId: string | null;
  esGlobal: boolean;
  documentoIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EjercicioCreateInput {
  workspaceId: string;
  titulo: string;
  objetivoPrincipal: string | null;
  numeroJugadoresMin: number | null;
  sedePropietariaId: string | null;
  esGlobal: boolean;
  documentoIds?: string[];
}

export type EjercicioUpdateInput = EjercicioCreateInput;
