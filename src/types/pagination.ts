/**
 * Paginación server-side opcional para los servicios de listado (`fetch*ByWorkspace`).
 * `limit`/`offset` mapean directamente a `.range(offset, offset + limit - 1)` de Supabase.
 */
export interface PaginationParams {
  limit: number;
  offset: number;
}
