import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { generateDummyMetricsForWorkspace } from "../lib/metrics-generator.js";
import { workspaceScope } from "../lib/workspace-scope.js";

export async function metricsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", workspaceScope);

  /**
   * GET /api/v1/w/:slug/metrics — últimos N puntos crudos.
   */
  app.get<{ Params: { slug: string }; Querystring: { limit?: string } }>(
    "/",
    async (req) => {
      const limit = Math.min(parseInt(req.query.limit ?? "200", 10), 1000);
      return prisma.metric.findMany({
        where: { workspaceId: req.workspaceId! },
        orderBy: { fetchedAt: "desc" },
        take: limit,
      });
    },
  );

  /**
   * GET /api/v1/w/:slug/metrics/summary — agregado para dashboard.
   */
  app.get<{ Params: { slug: string } }>("/summary", async (req) => {
    const metrics = await prisma.metric.findMany({
      where: { workspaceId: req.workspaceId! },
      orderBy: { fetchedAt: "desc" },
      take: 500,
    });

    const totalReach = metrics.reduce((s, m) => s + (m.reach ?? 0), 0);
    const totalImpressions = metrics.reduce((s, m) => s + (m.impressions ?? 0), 0);
    const totalLikes = metrics.reduce((s, m) => s + (m.likes ?? 0), 0);
    const totalSpend = metrics.reduce((s, m) => s + (m.spendCents ?? 0), 0) / 100;
    const engagement = (totalLikes / Math.max(totalReach, 1)) * 100;

    // Por cuenta
    const variants = await prisma.platformVariant.findMany({
      where: { workspaceId: req.workspaceId! },
      include: { socialAccount: true },
    });
    const byAccount = new Map<string, { reach: number; engagement: number; published: number }>();
    for (const v of variants) {
      const accId = v.socialAccountId;
      const cur = byAccount.get(accId) ?? { reach: 0, engagement: 0, published: 0 };
      const vMetrics = metrics.filter((m) => m.platformVariantId === v.id);
      cur.reach += vMetrics.reduce((s, m) => s + (m.reach ?? 0), 0);
      cur.engagement += vMetrics.reduce(
        (s, m) => s + (m.likes ?? 0) + (m.comments ?? 0) + (m.shares ?? 0),
        0,
      );
      if (v.status === "published") cur.published += 1;
      byAccount.set(accId, cur);
    }

    return {
      totals: {
        reach: totalReach,
        impressions: totalImpressions,
        engagementRate: Number(engagement.toFixed(2)),
        spendEur: Number(totalSpend.toFixed(2)),
      },
      byAccount: Array.from(byAccount.entries()).map(([accountId, v]) => ({
        accountId,
        ...v,
      })),
      sampleSize: metrics.length,
    };
  });

  /**
   * POST /api/v1/w/:slug/metrics/generate-dummy — solo en dev/staging.
   * Útil para llenar los dashboards sin tener integración real con APIs externas.
   */
  app.post<{ Params: { slug: string } }>("/generate-dummy", async (req, reply) => {
    if (process.env.NODE_ENV === "production") {
      return reply.status(403).send({ error: "Disabled in production" });
    }
    const count = await generateDummyMetricsForWorkspace(req.workspaceId!);
    return { generated: count, message: `Created/updated metrics for ${count} variants` };
  });
}
