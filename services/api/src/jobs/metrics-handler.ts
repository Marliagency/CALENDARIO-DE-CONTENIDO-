import { prisma } from "../db.js";
import { adapterFor } from "../adapters/index.js";
import { decrypt } from "../lib/crypto.js";
import { generateDummyMetricsForWorkspace } from "../lib/metrics-generator.js";
import type { JobPayload } from "../lib/jobs.js";

/**
 * Handler del job "pull_metrics".
 *
 * Para cada variant publicada en el workspace, llama al adapter.fetchMetrics
 * y guarda los resultados en la tabla Metric.
 *
 * Mientras los adapters no estén implementados, hace fallback al generador
 * dummy para que los dashboards no se queden en cero.
 */
export async function pullMetricsHandler(payload: JobPayload["pull_metrics"]) {
  const variants = await prisma.platformVariant.findMany({
    where: {
      workspaceId: payload.workspaceId,
      status: "published",
    },
    include: { socialAccount: true },
  });

  let pulled = 0;
  let failed = 0;

  for (const variant of variants) {
    if (!variant.socialAccount.accessTokenEncrypted) {
      failed++;
      continue;
    }
    try {
      const adapter = adapterFor(variant.platform);
      const accessToken = decrypt(variant.socialAccount.accessTokenEncrypted);
      const metrics = await adapter.fetchMetrics(
        variant.socialAccount,
        variant,
        accessToken,
      );

      await prisma.metric.create({
        data: {
          platformVariantId: variant.id,
          workspaceId: payload.workspaceId,
          fetchedAt: new Date(),
          kind: variant.boostBudgetEur > 0 ? "paid" : "organic",
          reach: metrics.reach,
          impressions: metrics.impressions,
          views: metrics.views,
          likes: metrics.likes,
          comments: metrics.comments,
          shares: metrics.shares,
          saves: metrics.saves,
          completionRate: metrics.completionRate,
          raw: metrics.raw ? JSON.stringify(metrics.raw) : null,
        },
      });
      pulled++;
    } catch {
      failed++;
    }
  }

  // Fallback: si todos los pulls fallaron y estamos en dev, sintetizar dummy
  // para que el dashboard tenga datos.
  if (pulled === 0 && failed > 0 && process.env.NODE_ENV !== "production") {
    await generateDummyMetricsForWorkspace(payload.workspaceId);
  }

  return { pulled, failed };
}
