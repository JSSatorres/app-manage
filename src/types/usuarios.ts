export interface Usuario {
  id: string;
  email: string;
  nombre: string | null;
  /** @deprecated campo legacy, usar `workspaceRol` (workspace_members.role) */
  rol: string;
  /** Rol canónico del usuario en el workspace activo (workspace_members.role). */
  workspaceRol: string;
  telefono: string | null;
  fotoPerfil: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Campos de perfil editables desde el cliente (RLS-safe, sin email/id). */
export interface UsuarioUpdateInput {
  nombre?: string | null;
  telefono?: string | null;
}

