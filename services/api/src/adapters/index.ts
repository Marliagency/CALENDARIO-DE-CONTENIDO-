import type { PlatformAdapter } from "./types.js";
import { simulateAdapter } from "./simulate.js";

/**
 * Desde la migracion a Upload-Post (servicios/api/src/adapters/upload-post.ts),
 * Pulse ya no usa adapters propios contra Meta/TikTok/YouTube/LinkedIn/X.
 * Toda la publicacion real va por upload-post.ts desde publish-handler.ts.
 *
 * Mantenemos `simulateAdapter` para PULSE_SIMULATE_PUBLISH=1, util para
 * probar el ciclo end-to-end sin red.
 *
 * Los ficheros meta.ts, tiktok.ts, youtube.ts, linkedin.ts, twitter.ts
 * permanecen en disco pero no estan registrados aqui. Se eliminaran una
 * vez verificada la nueva ruta en produccion.
 */

const REAL_REGISTRY: Record<string, PlatformAdapter | undefined> = {};

export function adapterFor(platform: string): PlatformAdapter {
  if (process.env.PULSE_SIMULATE_PUBLISH === "1") {
    return simulateAdapter;
  }
  const adapter = REAL_REGISTRY[platform];
  if (!adapter) {
    throw new Error(
      `No hay adapter directo para "${platform}". La publicacion debe ir por Upload-Post (services/api/src/adapters/upload-post.ts).`,
    );
  }
  return adapter;
}

export { simulateAdapter };
export type { PlatformAdapter } from "./types.js";
