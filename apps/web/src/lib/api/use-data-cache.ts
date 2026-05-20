import { useSyncExternalStore } from "react";
import { dataCache } from "./data-cache";
import { mockMode } from "./client";

/**
 * Hook que fuerza re-render cuando la cache cambia.
 *
 * En modo mock no hay cache → no se suscribe, devuelve siempre 0.
 * En HTTP mode se suscribe a updates de dataCache.
 *
 * Las páginas que usan `sync.*` y quieren reaccionar a cambios deben
 * llamar a esto al inicio: `useCacheVersion();`
 */
export function useCacheVersion(): number {
  return useSyncExternalStore(
    (cb) => (mockMode ? () => {} : dataCache.subscribe(cb)),
    () => (mockMode ? 0 : (dataCache.loaded ? 1 : 0)) + (dataCache.workspaces.length << 4),
    () => 0,
  );
}
