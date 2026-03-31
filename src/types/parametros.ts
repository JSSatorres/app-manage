export interface ParametroSistema {
  id: string;
  categoria: string;
  nombre: string;
  activo: boolean;
  sedeId: string | null;
  workspaceId: string;
  createdAt: string;
}

export interface ParametroSistemaCreateInput {
  categoria: string;
  nombre: string;
  activo: boolean;
  sedeId: string | null;
  workspaceId: string;
}

export interface ParametroSistemaUpdateInput {
  nombre: string;
  activo: boolean;
  sedeId: string | null;
  workspaceId: string;
}

