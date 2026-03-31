import type { Rol } from "@/lib/constants";

export interface Usuario {
  id: string;
  email: string;
  nombre: string | null;
  rol: Rol;
  sedeId: string | null;
  telefono: string | null;
  fotoPerfil: string | null;
  createdAt: string;
  updatedAt: string;
}

