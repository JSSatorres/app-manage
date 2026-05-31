export interface Entrenador {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string | null;
  telefono: string | null;
  fechaNacimiento: string | null;
  titulacion: string | null;
  fotoUrl: string | null;
  notas: string | null;
  userId: string | null;
  workspaceId: string;
  sedeIds: string[];
  equipoIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EntrenadorCreateInput {
  nombre: string;
  apellidos: string | null;
  email: string | null;
  telefono: string | null;
  fechaNacimiento: string | null;
  titulacion: string | null;
  notas: string | null;
  workspaceId: string;
  sedeIds: string[];
  equipoIds: string[];
}

export type EntrenadorUpdateInput = EntrenadorCreateInput;
