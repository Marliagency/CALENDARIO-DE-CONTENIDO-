/**
 * Adapter de simulación.
 *
 * Cuando `PULSE_SIMULATE_PUBLISH=1`, este adapter sustituye a los reales
 * (meta/tiktok/youtube). Pretende publicar pero solo marca la variante como
 * publicada en BD y genera métricas dummy aleatorias.
 *
 * Útil para probar el flujo end-to-end (calendario → cola → publish job →
 * métricas → dashboard) sin App Review de Meta/TikTok/Google.
 */

import crypto from "node:crypto";
import type { PlatformAdapter } from "./types.js";

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const simulateAdapter: PlatformAdapter = {
  async exchangeCode(_code, _redirectUri) {
    return {
      accessToken: `sim_access_${crypto.randomBytes(8).toString("hex")}`,
      refreshToken: `sim_refresh_${crypto.randomBytes(8).toString("hex")}`,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      accountInfo: {
        platformUserId: `sim_user_${crypto.randomBytes(4).toString("hex")}`,
        handle: "simulated_account",
        displayName: "Simulated",
      },
    };
  },

  async refreshToken(_refreshToken) {
    return {
      accessToken: `sim_access_${crypto.randomBytes(8).toString("hex")}`,
      refreshToken: `sim_refresh_${crypto.randomBytes(8).toString("hex")}`,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    };
  },

  async publish(_account, _variant, _accessToken, idempotencyKey) {
    // Pequeño delay para simular la latencia de la API real.
    await new Promise((r) => setTimeout(r, 200));
    return {
      platformPostId: `sim_post_${idempotencyKey.slice(0, 8)}_${Date.now()}`,
      publishedAt: new Date(),
    };
  },

  async fetchMetrics(_account, _variant, _accessToken) {
    const impressions = randomInt(500, 12_000);
    const reach = Math.round(impressions * (0.6 + Math.random() * 0.3));
    const views = Math.round(impressions * (0.4 + Math.random() * 0.4));
    const likes = Math.round(views * (0.02 + Math.random() * 0.08));
    const comments = Math.round(likes * (0.05 + Math.random() * 0.15));
    const shares = Math.round(likes * (0.02 + Math.random() * 0.1));
    const saves = Math.round(likes * (0.05 + Math.random() * 0.2));
    return {
      impressions,
      reach,
      views,
      likes,
      comments,
      shares,
      saves,
      completionRate: 0.3 + Math.random() * 0.5,
      raw: { simulated: true },
    };
  },
};
