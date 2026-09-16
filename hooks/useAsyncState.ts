"use client";

import { useCallback, useState } from "react";
import type { AsyncViewState } from "@/types";

export function useAsyncState<T>(initial: T | null = null) {
  const [state, setState] = useState<AsyncViewState>(initial ? "success" : "empty");
  const [data, setData] = useState<T | null>(initial);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (fn: () => Promise<T>) => {
    setState("loading");
    setError(null);
    try {
      const result = await fn();
      setData(result);
      setState(result && !(Array.isArray(result) && result.length === 0) ? "success" : "empty");
      return result;
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Erro inesperado");
      return null;
    }
  }, []);

  return { state, data, error, run, setData };
}
