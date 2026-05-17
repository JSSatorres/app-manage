export interface ParametroSistema {
  id: string;
  categoria: string;
  nombre: string;
  activo: boolean;
  sedeId: string | null;
  createdAt: string;
}

export interface ParametroSistemaCreateInput {
  categoria: string;
  nombre: string;
  activo: boolean;
  sedeId: string | null;
}

export interface ParametroSistemaUpdateInput {
  nombre: string;
  activo: boolean;
  sedeId: string | null;
}
