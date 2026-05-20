/**
 * Capa unificada de acceso a datos.
 *
 * - En modo mock (VITE_MOCK_API=1): devuelve datos sync desde @pulse/mock-data.
 * - En modo HTTP (VITE_MOCK_API=0): hace fetch al backend Fastify.
 *
 * Las páginas usan `useApiResource(syncLoader, httpLoader)` para obtener
 * datos del modo que toque, con la misma API.
 */

import { useEffect, useState } from "react";
import { mockMode } from "./client";

export { sync, mockMode } from "./client";
export { http, isHttpMode, HttpError } from "./http";

interface ApiResource<T> {
  data: T | undefined;
  loading: boolean;
  error?: Error;
  refresh: () => void;
}

export function useApiResource<T>(
  syncLoader: () => T,
  httpLoader: () => Promise<T>,
  deps: unknown[] = [],
): ApiResource<T> {
  const [tick, setTick] = useState(0);
  const [data, setData] = useState<T | undefined>(() =>
    mockMode ? syncLoader() : undefined,
  );
  const [loading, setLoading] = useState(!mockMode);
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    if (mockMode) {
      setData(syncLoader());
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    httpLoader()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, loading, error, refresh: () => setTick((t) => t + 1) };
}

/**
 * Helper para mutaciones (approve, reject, boost, etc.). En modo mock
 * es noop devolviendo undefined; en modo HTTP hace fetch real.
 */
export function useApiMutation<TArgs extends unknown[], TResult>(
  httpMutation: (...args: TArgs) => Promise<TResult>,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  async function mutate(...args: TArgs): Promise<TResult | undefined> {
    if (mockMode) return undefined; // No-op en mock; el caller puede asumir éxito visual.
    setLoading(true);
    setError(undefined);
    try {
      const r = await httpMutation(...args);
      return r;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { mutate, loading, error };
}
