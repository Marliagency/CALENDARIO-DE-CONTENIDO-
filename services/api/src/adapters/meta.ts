/**
 * Adapter Meta (Instagram + Facebook).
 *
 * Estado actual: stub. Las implementaciones reales se añaden en Fase 5+
 * cuando el App Review de Meta esté aprobado.
 *
 * Referencias:
 * - Graph API: https://developers.facebook.com/docs/graph-api
 * - IG Content Publishing: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
 */

import type { PlatformAdapter } from "./types.js";

const STUB_ERROR = "Meta adapter no implementado todavía — requiere App Review";

export const metaAdapter: PlatformAdapter = {
  async exchangeCode(_code, _redirectUri) {
    throw new Error(STUB_ERROR);
  },

  async refreshToken(_refreshToken) {
    throw new Error(STUB_ERROR);
  },

  async publish(_account, _variant, _accessToken, _idempotencyKey) {
    throw new Error(STUB_ERROR);
  },

  async fetchMetrics(_account, _variant, _accessToken) {
    throw new Error(STUB_ERROR);
  },
};
