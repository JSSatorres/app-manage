export interface Equipo {
  id: string;
  nombre: string;
  categoria: string | null;
  sedeId: string;
  workspaceId: string | null;
  entrenadorIds: string[];
  jugadorIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EquipoCreateInput {
  nombre: string;
  categoria: string | null;
  sedeId: string;
  workspaceId: string;
  entrenadorIds: string[];
  jugadorIds: string[];
}

export interface EquipoUpdateInput {
  nombre: string;
  categoria: string | null;
  sedeId: string;
  workspaceId: string;
  entrenadorIds: string[];
  jugadorIds: string[];
}
