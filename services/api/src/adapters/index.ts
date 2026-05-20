import type { PlatformAdapter } from "./types.js";
import { metaAdapter } from "./meta.js";
import { tiktokAdapter } from "./tiktok.js";
import { youtubeAdapter } from "./youtube.js";

const REGISTRY: Record<string, PlatformAdapter | undefined> = {
  instagram: metaAdapter,
  facebook: metaAdapter,
  tiktok: tiktokAdapter,
  youtube: youtubeAdapter,
};

export function adapterFor(platform: string): PlatformAdapter {
  const adapter = REGISTRY[platform];
  if (!adapter) {
    throw new Error(`No adapter for platform "${platform}"`);
  }
  return adapter;
}

export { metaAdapter, tiktokAdapter, youtubeAdapter };
export type { PlatformAdapter } from "./types.js";
