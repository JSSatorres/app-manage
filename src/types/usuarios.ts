export interface Usuario {
  id: string;
  email: string;
  nombre: string | null;
  /** @deprecated campo legacy, usar workspace_members para el rol real */
  rol: string;
  telefono: string | null;
  fotoPerfil: string | null;
  createdAt: string;
  updatedAt: string;
}

