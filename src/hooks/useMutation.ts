"use client";

import { useCallback } from "react";
import {
  useMutation as useRQMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

export type MutationFnResult<T> = { data: T | null; error: unknown | null };

export interface UseMutationResult<T, V> {
  mutate: (variables: V) => Promise<T | null>;
  loading: boolean;
  errorMessage: string | null;
  reset: () => void;
}

export interface UseMutationOptions {
  /**
   * Prefijos de `queryKey` a invalidar tras una mutación exitosa. La
   * invalidación es por prefijo, así que `["jugadores"]` refresca todas las
   * variantes (`["jugadores", ws]`, `["jugadores", ws, sede]`, etc.).
   */
  invalidateKeys?: QueryKey[];
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

export function useMutation<T, V>(
  mutationFn: (variables: V) => Promise<MutationFnResult<T>>,
  options: UseMutationOptions = {},
): UseMutationResult<T, V> {
  const client = useQueryClient();
  const invalidateKeys = options.invalidateKeys;

  const mutation = useRQMutation<T | null, Error, V>({
    mutationFn: async (variables: V) => {
      const result = await mutationFn(variables);
      if (result.error) throw new Error(getErrorMessage(result.error));
      return result.data;
    },
    onSuccess: async () => {
      if (!invalidateKeys?.length) return;
      await Promise.all(
        invalidateKeys.map((key) => client.invalidateQueries({ queryKey: key })),
      );
    },
  });

  const mutate = useCallback(
    async (variables: V): Promise<T | null> => {
      try {
        return await mutation.mutateAsync(variables);
      } catch {
        return null;
      }
    },
    [mutation],
  );

  const reset = useCallback(() => mutation.reset(), [mutation]);

  return {
    mutate,
    loading: mutation.isPending,
    errorMessage: mutation.isError ? getErrorMessage(mutation.error) : null,
    reset,
  };
}
