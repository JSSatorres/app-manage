"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

export function useQuery<T>(
  queryFn: () => Promise<QueryFnResult<T>>,
  deps: readonly unknown[] = [],
): UseQueryResult<T> {
  const depsKey = useMemo(() => JSON.stringify(deps), [deps]);
  const queryFnRef = useRef(queryFn);
  useEffect(() => {
    queryFnRef.current = queryFn;
  });

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await queryFnRef.current();
      if (result.error) {
        setData(null);
        setErrorMessage(getErrorMessage(result.error));
        setLoading(false);
        return;
      }
      setData(result.data);
      setLoading(false);
    } catch (error) {
      setData(null);
      setErrorMessage(getErrorMessage(error));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true);
        setErrorMessage(null);
      }
    });
    queryFnRef.current().then(
      (result) => {
        if (cancelled) return;
        if (result.error) {
          setData(null);
          setErrorMessage(getErrorMessage(result.error));
        } else {
          setData(result.data);
        }
        setLoading(false);
      },
      (error) => {
        if (cancelled) return;
        setData(null);
        setErrorMessage(getErrorMessage(error));
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [depsKey]);

  return { data, loading, errorMessage, refetch };
}

