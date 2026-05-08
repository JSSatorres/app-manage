import type { Json } from "@/types/database.types";

export interface Sede {
  id: string;
  nombre: string;
  direccion: string | null;
  configuracionVisual: Json;
  responsableId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SedeCreateInput {
  nombre: string;
  direccion: string | null;
}

export interface SedeUpdateInput {
  nombre: string;
  direccion: string | null;
}
