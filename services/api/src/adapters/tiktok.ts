/**
 * Adapter TikTok — stub.
 *
 * Referencias:
 * - Content Posting API: https://developers.tiktok.com/doc/content-posting-api-get-started
 * - Marketing API (Spark Ads): https://business-api.tiktok.com/portal/docs
 */

import type { PlatformAdapter } from "./types.js";

const STUB_ERROR = "TikTok adapter no implementado todavía";

export const tiktokAdapter: PlatformAdapter = {
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
