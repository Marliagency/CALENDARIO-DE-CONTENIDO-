import { enqueueJob, tick } from "../lib/jobs.js";
import { publishHandler } from "./publish-handler.js";
import { publishScheduler } from "./scheduler.js";
import { scheduleTokenRefreshes, tokenRefreshHandler } from "./token-refresh-handler.js";
import { pullMetricsHandler } from "./metrics-handler.js";
import { prisma } from "../db.js";

/**
 * Runner de jobs in-process.
 *
 * Ciclo:
 *  - cada 5s    → tick() de la cola (procesa el job más antiguo pending)
 *  - cada 60s   → publishScheduler (encola publish para variants ya programadas)
 *  - cada 1h    → token refresh scheduler (encola refresh para tokens que expiran <24h)
 *  - cada 24h   → pull metrics para todos los workspaces activos
 */

const HANDLERS = {
  publish: publishHandler,
  refresh_token: tokenRefreshHandler,
  pull_metrics: pullMetricsHandler,
  reset_rate_limit: async () => {
    // Resetea contadores diarios. Implementación trivial.
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    await prisma.apiRateLimit.deleteMany({
      where: { date: { lt: yesterday } },
    });
  },
};

let started = false;

export function startJobRunner(opts?: {
  interval?: number;
  schedulerInterval?: number;
  tokenRefreshInterval?: number;
  metricsPullInterval?: number;
}) {
  if (started) return;
  started = true;
  const interval = opts?.interval ?? 5_000;
  const schedulerInterval = opts?.schedulerInterval ?? 60_000;
  const tokenRefreshInterval = opts?.tokenRefreshInterval ?? 60 * 60 * 1000;
  const metricsPullInterval = opts?.metricsPullInterval ?? 24 * 60 * 60 * 1000;

  let processing = false;
  setInterval(async () => {
    if (processing) return;
    processing = true;
    try {
      while (await tick(HANDLERS)) {
        /* drain */
      }
    } catch (err) {
      console.error("[runner] error", err);
    } finally {
      processing = false;
    }
  }, interval);

  // Publish scheduler — encola publish jobs para variants programadas
  setInterval(async () => {
    try {
      await publishScheduler();
    } catch (err) {
      console.error("[publish-scheduler] error", err);
    }
  }, schedulerInterval);

  // Token refresh scheduler — encola refresh para tokens próximos a expirar
  setInterval(async () => {
    try {
      const accounts = await scheduleTokenRefreshes();
      for (const acc of accounts) {
        await enqueueJob("refresh_token", { socialAccountId: acc.id });
      }
      if (accounts.length > 0) {
        console.log(`[token-refresh] enqueued ${accounts.length} refresh jobs`);
      }
    } catch (err) {
      console.error("[token-refresh-scheduler] error", err);
    }
  }, tokenRefreshInterval);

  // Metrics pull — diario por workspace
  setInterval(async () => {
    try {
      const workspaces = await prisma.workspace.findMany({
        where: { status: "active" },
      });
      for (const ws of workspaces) {
        await enqueueJob("pull_metrics", { workspaceId: ws.id });
      }
    } catch (err) {
      console.error("[metrics-pull-scheduler] error", err);
    }
  }, metricsPullInterval);

  console.log(
    `[jobs] runner started (poll ${interval}ms, publish ${schedulerInterval}ms, refresh ${tokenRefreshInterval}ms, metrics ${metricsPullInterval}ms)`,
  );
}
