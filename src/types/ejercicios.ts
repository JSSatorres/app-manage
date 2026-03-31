export interface Ejercicio {
  id: string;
  titulo: string;
  objetivoPrincipal: string | null;
  numeroJugadoresMin: number | null;
  sedePropietariaId: string | null;
  esGlobal: boolean;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface EjercicioCreateInput {
  titulo: string;
  objetivoPrincipal: string | null;
  numeroJugadoresMin: number | null;
  sedePropietariaId: string | null;
  esGlobal: boolean;
  workspaceId: string;
}

export interface EjercicioUpdateInput extends EjercicioCreateInput {}

