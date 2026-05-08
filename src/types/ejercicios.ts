export interface Ejercicio {
  id: string;
  titulo: string;
  objetivoPrincipal: string | null;
  numeroJugadoresMin: number | null;
  sedePropietariaId: string | null;
  esGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EjercicioCreateInput {
  titulo: string;
  objetivoPrincipal: string | null;
  numeroJugadoresMin: number | null;
  sedePropietariaId: string | null;
  esGlobal: boolean;
}

export type EjercicioUpdateInput = EjercicioCreateInput;
