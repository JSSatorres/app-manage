export type PieDominante = "Diestro" | "Zurdo" | "Ambidiestro";

export interface Jugador {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string | null;
  telefono: string | null;
  fechaNacimiento: string | null;
  dorsal: number | null;
  posicion: string | null;
  pieDominante: PieDominante | null;
  fotoUrl: string | null;
  notas: string | null;
  tutorNombre: string | null;
  tutorTelefono: string | null;
  userId: string | null;
  workspaceId: string;
  sedeIds: string[];
  equipoIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface JugadorCreateInput {
  nombre: string;
  apellidos: string | null;
  email: string | null;
  telefono: string | null;
  fechaNacimiento: string | null;
  dorsal: number | null;
  posicion: string | null;
  pieDominante: PieDominante | null;
  notas: string | null;
  tutorNombre: string | null;
  tutorTelefono: string | null;
  workspaceId: string;
  sedeIds: string[];
  equipoIds: string[];
}

export type JugadorUpdateInput = JugadorCreateInput;
