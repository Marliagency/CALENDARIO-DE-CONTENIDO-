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
   * GET /api/v1/w/:slug/metrics/daily — serie diaria agregada.
   * Shape: [{ date, workspaceId, reach, impressions, engagementRate, publishedCount, boostSpendEur }]
   */
  app.get<{ Params: { slug: string }; Querystring: { days?: string } }>(
    "/daily",
    async (req) => {
      const days = Math.min(parseInt(req.query.days ?? "7", 10), 90);
      const since = new Date();
      since.setDate(since.getDate() - days + 1);
      since.setHours(0, 0, 0, 0);

      const metrics = await prisma.metric.findMany({
        where: {
          workspaceId: req.workspaceId!,
          fetchedAt: { gte: since },
        },
      });

      const variants = await prisma.platformVariant.findMany({
        where: { workspaceId: req.workspaceId! },
        select: { id: true, publishedAt: true, scheduledAt: true },
      });

      const byDay = new Map<
        string,
        {
          reach: number;
          impressions: number;
          likes: number;
          comments: number;
          shares: number;
          spendCents: number;
          count: number;
        }
      >();
      for (const m of metrics) {
        const day = m.fetchedAt.toISOString().slice(0, 10);
        const cur = byDay.get(day) ?? {
          reach: 0,
          impressions: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          spendCents: 0,
          count: 0,
        };
        cur.reach += m.reach ?? 0;
        cur.impressions += m.impressions ?? 0;
        cur.likes += m.likes ?? 0;
        cur.comments += m.comments ?? 0;
        cur.shares += m.shares ?? 0;
        cur.spendCents += m.spendCents ?? 0;
        cur.count++;
        byDay.set(day, cur);
      }

      const publishedByDay = new Map<string, number>();
      for (const v of variants) {
        const d = v.publishedAt ?? v.scheduledAt;
        if (!d) continue;
        const day = d.toISOString().slice(0, 10);
        if (new Date(day) < since) continue;
        publishedByDay.set(day, (publishedByDay.get(day) ?? 0) + 1);
      }

      const result = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(since);
        d.setDate(d.getDate() + i);
        const dayKey = d.toISOString().slice(0, 10);
        const agg = byDay.get(dayKey);
        const eng = agg
          ? ((agg.likes + agg.comments + agg.shares) / Math.max(agg.reach, 1)) * 100
          : 0;
        result.push({
          date: dayKey,
          workspaceId: req.workspaceId!,
          reach: agg?.reach ?? 0,
          impressions: agg?.impressions ?? 0,
          engagementRate: Number(eng.toFixed(2)),
          publishedCount: publishedByDay.get(dayKey) ?? 0,
          boostSpendEur: agg ? Number((agg.spendCents / 100).toFixed(2)) : 0,
        });
      }
      return result;
    },
  );

  /**
   * GET /api/v1/w/:slug/metrics/by-account — agregado por cuenta social.
   */
  app.get<{ Params: { slug: string } }>("/by-account", async (req) => {
    const variants = await prisma.platformVariant.findMany({
      where: { workspaceId: req.workspaceId! },
      include: { metrics: true },
    });

    const byAccount = new Map<
      string,
      {
        reach: number;
        engagement: number;
        publishedCount: number;
        organicReach: number;
        paidReach: number;
      }
    >();

    for (const v of variants) {
      const cur = byAccount.get(v.socialAccountId) ?? {
        reach: 0,
        engagement: 0,
        publishedCount: 0,
        organicReach: 0,
        paidReach: 0,
      };
      for (const m of v.metrics) {
        cur.reach += m.reach ?? 0;
        cur.engagement += (m.likes ?? 0) + (m.comments ?? 0) + (m.shares ?? 0);
        if (m.kind === "paid") cur.paidReach += m.reach ?? 0;
        else cur.organicReach += m.reach ?? 0;
      }
      if (v.status === "published") cur.publishedCount += 1;
      byAccount.set(v.socialAccountId, cur);
    }

    return Array.from(byAccount.entries()).map(([socialAccountId, v]) => ({
      socialAccountId,
      workspaceId: req.workspaceId!,
      ...v,
    }));
  });

  /**
   * GET /api/v1/w/:slug/metrics/by-format — agregado por formato.
   */
  app.get<{ Params: { slug: string } }>("/by-format", async (req) => {
    const pieces = await prisma.contentPiece.findMany({
      where: { workspaceId: req.workspaceId! },
      include: { variants: { include: { metrics: true } } },
    });

    const byFormat = new Map<
      string,
      {
        totalReach: number;
        totalEngagement: number;
        totalCompletion: number;
        completionCount: number;
        totalCpmCents: number;
        cpmCount: number;
        count: number;
      }
    >();

    const FORMAT_LABEL: Record<string, string> = {
      image: "Imagen",
      carousel: "Carrusel",
      reel: "Reel",
      ugc_video: "UGC Video",
      app_demo: "App Demo",
      lifestyle_ad: "Lifestyle Ad",
      short: "Short",
      post: "Post",
    };

    for (const p of pieces) {
      const label = FORMAT_LABEL[p.format] ?? p.format;
      const cur = byFormat.get(label) ?? {
        totalReach: 0,
        totalEngagement: 0,
        totalCompletion: 0,
        completionCount: 0,
        totalCpmCents: 0,
        cpmCount: 0,
        count: 0,
      };
      cur.count++;
      for (const v of p.variants) {
        for (const m of v.metrics) {
          cur.totalReach += m.reach ?? 0;
          cur.totalEngagement += (m.likes ?? 0) + (m.comments ?? 0) + (m.shares ?? 0);
          if (m.completionRate != null) {
            cur.totalCompletion += m.completionRate;
            cur.completionCount++;
          }
          if (m.cpmCents != null) {
            cur.totalCpmCents += m.cpmCents;
            cur.cpmCount++;
          }
        }
      }
      byFormat.set(label, cur);
    }

    return Array.from(byFormat.entries()).map(([format, v]) => ({
      workspaceId: req.workspaceId!,
      format,
      avgReach: v.count > 0 ? Math.round(v.totalReach / v.count) : 0,
      avgEngagementRate:
        v.totalReach > 0
          ? Number(((v.totalEngagement / v.totalReach) * 100).toFixed(2))
          : 0,
      avgCompletionRate:
        v.completionCount > 0 ? Math.round(v.totalCompletion / v.completionCount) : 0,
      cpmCents: v.cpmCount > 0 ? Math.round(v.totalCpmCents / v.cpmCount) : undefined,
      count: v.count,
    }));
  });

  /**
   * GET /api/v1/w/:slug/metrics/summary — totales globales para KPIs.
   */
  app.get<{ Params: { slug: string } }>("/summary", async (req) => {
    const metrics = await prisma.metric.findMany({
      where: { workspaceId: req.workspaceId! },
      orderBy: { fetchedAt: "desc" },
      take: 1000,
    });

    const totalReach = metrics.reduce((s, m) => s + (m.reach ?? 0), 0);
    const totalImpressions = metrics.reduce((s, m) => s + (m.impressions ?? 0), 0);
    const totalLikes = metrics.reduce((s, m) => s + (m.likes ?? 0), 0);
    const totalSpend = metrics.reduce((s, m) => s + (m.spendCents ?? 0), 0) / 100;
    const engagement = (totalLikes / Math.max(totalReach, 1)) * 100;

    return {
      totals: {
        reach: totalReach,
        impressions: totalImpressions,
        engagementRate: Number(engagement.toFixed(2)),
        spendEur: Number(totalSpend.toFixed(2)),
      },
      sampleSize: metrics.length,
    };
  });

  /**
   * POST /api/v1/w/:slug/metrics/generate-dummy — solo en dev/staging.
   */
  app.post<{
    Params: { slug: string };
    Body: { days?: number };
  }>("/generate-dummy", async (req, reply) => {
    if (process.env.NODE_ENV === "production") {
      return reply.status(403).send({ error: "Disabled in production" });
    }
    const result = await generateDummyMetricsForWorkspace(
      req.workspaceId!,
      req.body?.days,
    );
    return result;
  });
}
