"use client";

import { useCallback, useRef, useEffect } from "react";
import {
  useQuery as useRQQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

export type QueryFnResult<T> = { data: T | null; error: unknown | null };

export interface UseQueryResult<T> {
  data: T | null;
  loading: boolean;
  errorMessage: string | null;
  refetch: () => Promise<void>;
}

function getErrorMessage(error: unknown): string {
  if (!error) return "Error desconocido";
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Error desconocido";
}

/**
 * Lectura de datos sobre React Query, compartiendo caché por `deps`.
 *
 * `deps` actúa como `queryKey`: dos hooks con la misma key comparten la misma
 * entrada de caché, y una mutación que invalide esa key refresca todas las
 * vistas que la usan. Por eso el primer elemento de `deps` debe ser un
 * namespace de dominio (p. ej. `["jugadores", workspaceId, sedeId]`).
 */
export function useQuery<T>(
  queryFn: () => Promise<QueryFnResult<T>>,
  deps: readonly unknown[] = [],
): UseQueryResult<T> {
  // React Query hace hashing estructural de la key, así que basta pasar `deps`
  // directamente; dos hooks con la misma key comparten caché.
  const queryKey = deps as QueryKey;
  const queryKeyHash = JSON.stringify(deps);

  // Mantener una referencia estable a la última queryFn sin recrear la query.
  const queryFnRef = useRef(queryFn);
  useEffect(() => {
    queryFnRef.current = queryFn;
  });

  const query = useRQQuery<T | null, Error>({
    queryKey,
    queryFn: async () => {
      const result = await queryFnRef.current();
      if (result.error) throw new Error(getErrorMessage(result.error));
      return result.data;
    },
  });

  const client = useQueryClient();
  const refetch = useCallback(async () => {
    await client.invalidateQueries({ queryKey: JSON.parse(queryKeyHash) as QueryKey });
  }, [client, queryKeyHash]);

  return {
    data: query.data ?? null,
    loading: query.isPending,
    errorMessage: query.isError ? getErrorMessage(query.error) : null,
    refetch,
  };
}
