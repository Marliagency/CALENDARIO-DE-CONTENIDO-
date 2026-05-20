import type { PlatformAdapter } from "./types.js";
import { metaAdapter } from "./meta.js";
import { tiktokAdapter } from "./tiktok.js";
import { youtubeAdapter } from "./youtube.js";
import { simulateAdapter } from "./simulate.js";

const REAL_REGISTRY: Record<string, PlatformAdapter | undefined> = {
  instagram: metaAdapter,
  facebook: metaAdapter,
  tiktok: tiktokAdapter,
  youtube: youtubeAdapter,
};

/**
 * Devuelve el adapter para una plataforma.
 *
 * Si `PULSE_SIMULATE_PUBLISH=1`, se usa el adapter de simulación para
 * todas las plataformas — útil para probar el ciclo end-to-end sin
 * credenciales OAuth reales.
 */
export function adapterFor(platform: string): PlatformAdapter {
  if (process.env.PULSE_SIMULATE_PUBLISH === "1") {
    return simulateAdapter;
  }
  const adapter = REAL_REGISTRY[platform];
  if (!adapter) {
    throw new Error(`No adapter for platform "${platform}"`);
  }
  return adapter;
}

export { metaAdapter, tiktokAdapter, youtubeAdapter, simulateAdapter };
export type { PlatformAdapter } from "./types.js";
