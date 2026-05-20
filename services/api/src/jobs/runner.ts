import { tick } from "../lib/jobs.js";
import { publishHandler } from "./publish-handler.js";
import { publishScheduler } from "./scheduler.js";

/**
 * Runner de jobs in-process. En production esto se separaría a un worker
 * dedicado; en development corre dentro del mismo Fastify para mantener
 * 1 sola CLI activa.
 *
 * Ciclo:
 *  - cada 5s   → tick() de la cola
 *  - cada 60s  → publishScheduler() que encola publish jobs
 */

const HANDLERS = {
  publish: publishHandler,
  // refresh_token: refreshTokenHandler,    // Fase 5
  // pull_metrics: pullMetricsHandler,      // Fase 11
  // reset_rate_limit: resetRateLimitHandler,
};

let started = false;

export function startJobRunner(opts?: { interval?: number; schedulerInterval?: number }) {
  if (started) return;
  started = true;
  const interval = opts?.interval ?? 5_000;
  const schedulerInterval = opts?.schedulerInterval ?? 60_000;

  let processing = false;
  setInterval(async () => {
    if (processing) return;
    processing = true;
    try {
      // Drenar la cola hasta vaciar (1 job por iteración).
      while (await tick(HANDLERS)) {
        /* loop until queue empty */
      }
    } catch (err) {
      console.error("[runner] error", err);
    } finally {
      processing = false;
    }
  }, interval);

  setInterval(async () => {
    try {
      await publishScheduler();
    } catch (err) {
      console.error("[scheduler] error", err);
    }
  }, schedulerInterval);

  console.log(
    `[jobs] runner started (poll ${interval}ms, scheduler ${schedulerInterval}ms)`,
  );
}
