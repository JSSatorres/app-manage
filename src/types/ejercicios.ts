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
  titulo: string;
  objetivoPrincipal: string | null;
  numeroJugadoresMin: number | null;
  sedePropietariaId: string | null;
  esGlobal: boolean;
  documentoIds?: string[];
}

export type EjercicioUpdateInput = EjercicioCreateInput;
