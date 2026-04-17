"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MutationFnResult<T> = { data: T | null; error: unknown | null };

export interface UseMutationResult<T, V> {
  mutate: (variables: V) => Promise<T | null>;
  loading: boolean;
  errorMessage: string | null;
  reset: () => void;
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
): UseMutationResult<T, V> {
  const mutationFnRef = useRef(mutationFn);
  useEffect(() => {
    mutationFnRef.current = mutationFn;
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = useCallback(() => setErrorMessage(null), []);

  const mutate = useCallback(async (variables: V) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await mutationFnRef.current(variables);
      if (result.error) {
        setLoading(false);
        setErrorMessage(getErrorMessage(result.error));
        return null;
      }
      setLoading(false);
      return result.data;
    } catch (error) {
      setLoading(false);
      setErrorMessage(getErrorMessage(error));
      return null;
    }
  }, []);

  return { mutate, loading, errorMessage, reset };
}

