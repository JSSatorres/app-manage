import type { QueryKey } from "@tanstack/react-query";

/**
 * Claves de caché centralizadas para React Query.
 *
 * Las listas usan claves con namespace de dominio para que distintas vistas
 * compartan caché, y las mutaciones invaliden por prefijo de dominio (con
 * `prefix.*` se invalidan todas las variantes por workspace/sede).
 *
 * Relaciones N:M (jugador↔equipo, jugador↔sede, entrenador↔equipo): al mutar
 * un jugador hay que invalidar también equipos/entrenadores y sus lookups,
 * porque sus listados embeben los ids de la relación.
 */
/** Página server-side: `page` 0-indexado + tamaño de página. */
export interface ListPagination {
  page: number;
  pageSize: number;
}

export const queryKeys = {
  jugadores: {
    prefix: ["jugadores"] as const,
    list: (
      workspaceId: string | null,
      sedeId?: string | null,
      pagination?: ListPagination | null,
    ): QueryKey => ["jugadores", workspaceId, sedeId ?? null, pagination ?? null],
    lookup: (sedeId: string | null): QueryKey => ["jugadores", "lookup", sedeId],
  },
  equipos: {
    prefix: ["equipos"] as const,
    list: (
      workspaceId: string | null,
      sedeId?: string | null,
      pagination?: ListPagination | null,
    ): QueryKey => ["equipos", workspaceId, sedeId ?? null, pagination ?? null],
    lookup: (sedeIds: string[]): QueryKey => ["equipos", "lookup", sedeIds],
  },
  entrenadores: {
    prefix: ["entrenadores"] as const,
    list: (
      workspaceId: string | null,
      sedeId?: string | null,
      pagination?: ListPagination | null,
    ): QueryKey => ["entrenadores", workspaceId, sedeId ?? null, pagination ?? null],
    lookupBySede: (sedeId: string | null): QueryKey => ["entrenadores", "lookup-sede", sedeId],
    lookupBySedes: (sedeIds: string[]): QueryKey => ["entrenadores", "lookup-sedes", sedeIds],
    lookupByWorkspace: (workspaceId: string | null): QueryKey => [
      "entrenadores",
      "lookup-ws",
      workspaceId,
    ],
  },
  sedes: {
    prefix: ["sedes"] as const,
    list: (workspaceId: string | null): QueryKey => ["sedes", workspaceId],
    lookup: (workspaceId: string | null): QueryKey => ["sedes", "lookup", workspaceId],
  },
  ejercicios: {
    prefix: ["ejercicios"] as const,
    list: (sedeId: string | null): QueryKey => ["ejercicios", sedeId],
  },
  sesiones: {
    prefix: ["sesiones"] as const,
    list: (sedeIds: string[]): QueryKey => ["sesiones", sedeIds],
    detalle: (sesionId: string | null): QueryKey => ["sesiones", "detalle", sesionId],
    documentos: (sesionId: string | null): QueryKey => ["sesiones", "documentos", sesionId],
  },
  documentos: {
    prefix: ["documentos"] as const,
    list: (
      sedeIds: string[],
      workspaceId: string | null,
      entrenadorUserId: string | null,
    ): QueryKey => ["documentos", sedeIds, workspaceId, entrenadorUserId],
  },
  parametros: {
    prefix: ["parametros"] as const,
    list: (categoria: string, sedeId: string | null): QueryKey => [
      "parametros",
      categoria,
      sedeId,
    ],
  },
  usuarios: {
    prefix: ["usuarios"] as const,
    list: (workspaceId: string | null): QueryKey => ["usuarios", "list", workspaceId],
    lookup: (workspaceId: string | null): QueryKey => ["usuarios", "lookup", workspaceId],
  },
} as const;
