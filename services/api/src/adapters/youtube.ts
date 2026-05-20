/**
 * Adapter YouTube — stub.
 * Referencias: https://developers.google.com/youtube/v3/docs
 */

import type { PlatformAdapter } from "./types.js";

const STUB_ERROR = "YouTube adapter no implementado todavía";

export const youtubeAdapter: PlatformAdapter = {
  async exchangeCode() {
    throw new Error(STUB_ERROR);
  },
  async refreshToken() {
    throw new Error(STUB_ERROR);
  },
  async publish() {
    throw new Error(STUB_ERROR);
  },
  async fetchMetrics() {
    throw new Error(STUB_ERROR);
  },
};
