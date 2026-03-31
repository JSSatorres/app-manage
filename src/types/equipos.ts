export interface Equipo {
  id: string;
  nombre: string;
  categoria: string | null;
  sedeId: string;
  entrenadorPrincipalId: string | null;
  entrenadorAdjuntoId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EquipoCreateInput {
  nombre: string;
  categoria: string | null;
  sedeId: string;
  entrenadorPrincipalId: string | null;
  entrenadorAdjuntoId: string | null;
}

export interface EquipoUpdateInput {
  nombre: string;
  categoria: string | null;
  sedeId: string;
  entrenadorPrincipalId: string | null;
  entrenadorAdjuntoId: string | null;
}

