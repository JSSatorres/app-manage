import type { Json } from "@/types/database.types";

export interface Sede {
  id: string;
  nombre: string;
  direccion: string | null;
  configuracionVisual: Json;
  responsableId: string | null;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SedeCreateInput {
  nombre: string;
  direccion: string | null;
  workspaceId: string;
}

export interface SedeUpdateInput {
  nombre: string;
  direccion: string | null;
}

