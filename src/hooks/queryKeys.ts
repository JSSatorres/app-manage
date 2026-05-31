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
export const queryKeys = {
  jugadores: {
    prefix: ["jugadores"] as const,
    list: (workspaceId: string | null, sedeId?: string | null): QueryKey => [
      "jugadores",
      workspaceId,
      sedeId ?? null,
    ],
    lookup: (sedeId: string | null): QueryKey => ["jugadores", "lookup", sedeId],
  },
  equipos: {
    prefix: ["equipos"] as const,
    list: (workspaceId: string | null, sedeId?: string | null): QueryKey => [
      "equipos",
      workspaceId,
      sedeId ?? null,
    ],
    lookup: (sedeIds: string[]): QueryKey => ["equipos", "lookup", sedeIds],
  },
  entrenadores: {
    prefix: ["entrenadores"] as const,
    list: (workspaceId: string | null, sedeId?: string | null): QueryKey => [
      "entrenadores",
      workspaceId,
      sedeId ?? null,
    ],
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
    lookup: (): QueryKey => ["sedes", "lookup"],
  },
} as const;
