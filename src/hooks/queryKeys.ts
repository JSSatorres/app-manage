import type { QueryKey } from "@tanstack/react-query";
import type { EconomicFilters, EconomicScheduleStatus } from "@/types/economia";
import type { ContentProvider } from "@/types/content-assets";

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
    cloneableContent: (
      workspaceId: string | null,
      sourceSedeId: string | null,
    ): QueryKey => ["sedes", "cloneable-content", workspaceId, sourceSedeId],
  },
  ejercicios: {
    prefix: ["ejercicios"] as const,
    list: (sedeId: string | null): QueryKey => ["ejercicios", sedeId],
  },
  sesiones: {
    prefix: ["sesiones"] as const,
    list: (sedeIds: string[]): QueryKey => ["sesiones", sedeIds],
    detalle: (sesionId: string | null): QueryKey => ["sesiones", "detalle", sesionId],
    bloques: (sesionId: string | null): QueryKey => ["sesiones", "bloques", sesionId],
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
  contentAssets: {
    prefix: ["content-assets"] as const,
    list: (
      workspaceId: string | null,
      provider: ContentProvider | null,
      sedeId: string | null,
      pagination: { limit: number; offset: number } | null,
    ): QueryKey => ["content-assets", workspaceId, provider, sedeId, pagination],
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

/** Claves de caché del dominio económico, aisladas siempre por workspace. */
export const economicKeys = {
  settings: {
    detail: (workspaceId: string | null): QueryKey => ["economia", "settings", workspaceId],
  },
  summary: {
    prefix: ["economia", "summary"] as const,
    workspace: (workspaceId: string | null): QueryKey => ["economia", "summary", workspaceId],
    list: (workspaceId: string | null, filters: EconomicFilters): QueryKey => [
      "economia",
      "summary",
      workspaceId,
      filters,
    ],
  },
  entries: {
    prefix: ["economia", "entries"] as const,
    workspace: (workspaceId: string | null): QueryKey => ["economia", "entries", workspaceId],
    list: (workspaceId: string | null, filters: EconomicFilters): QueryKey => [
      "economia",
      "entries",
      workspaceId,
      filters,
    ],
    detail: (workspaceId: string | null, entryId: string): QueryKey => [
      "economia",
      "entries",
      workspaceId,
      "detail",
      entryId,
    ],
  },
  movements: {
    prefix: ["economia", "movements"] as const,
    workspace: (workspaceId: string | null): QueryKey => ["economia", "movements", workspaceId],
    list: (workspaceId: string | null): QueryKey => ["economia", "movements", workspaceId],
  },
  categories: {
    prefix: ["economia", "categories"] as const,
    workspace: (workspaceId: string | null): QueryKey => ["economia", "categories", workspaceId],
    list: (workspaceId: string | null, includeInactive: boolean): QueryKey => [
      "economia",
      "categories",
      workspaceId,
      includeInactive,
    ],
  },
  schedules: {
    prefix: ["economia", "schedules"] as const,
    workspace: (workspaceId: string | null): QueryKey => ["economia", "schedules", workspaceId],
    list: (workspaceId: string | null, status?: EconomicScheduleStatus): QueryKey => [
      "economia",
      "schedules",
      workspaceId,
      status ?? null,
    ],
  },
} as const;
