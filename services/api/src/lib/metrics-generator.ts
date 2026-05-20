/**
 * Generador de métricas dummy.
 *
 * En production esto lo sustituyen los pull workers que llaman a la Graph API,
 * TikTok Display API, YouTube Analytics, etc. Por ahora rellena la tabla
 * Metric con valores plausibles.
 *
 * - Genera N días hacia atrás (default 7) por cada variant publicada/programada.
 * - Idempotente: si ya hay métrica de ese día, la actualiza.
 */

import { prisma } from "../db.js";

const DAYS_BACK = 7;

export async function generateDummyMetricsForWorkspace(
  workspaceId: string,
  daysBack = DAYS_BACK,
) {
  const variants = await prisma.platformVariant.findMany({
    where: {
      workspaceId,
      status: { in: ["published", "scheduled"] },
    },
  });

  let written = 0;

  for (const v of variants) {
    const seed = hashSeed(v.id);

    for (let i = 0; i < daysBack; i++) {
      const day = new Date();
      day.setHours(12, 0, 0, 0);
      day.setDate(day.getDate() - i);

      // Variación diaria pseudo-aleatoria sobre el seed.
      const dayBoost = 0.7 + ((seed + i * 31) % 60) / 100; // 0.7 - 1.3
      const baseReach = 1500 + (seed % 9000);
      const reach = Math.round(baseReach * dayBoost);
      const impressions = Math.round(reach * 1.4);
      const engagement = (reach * (2 + ((seed + i) % 4))) / 100;
      const likes = Math.round(engagement * 0.65);
      const comments = Math.round(engagement * 0.08);
      const shares = Math.round(engagement * 0.1);
      const saves = Math.round(engagement * 0.17);

      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      const existing = await prisma.metric.findFirst({
        where: {
          platformVariantId: v.id,
          fetchedAt: { gte: dayStart, lte: dayEnd },
        },
      });
      const data = {
        platformVariantId: v.id,
        workspaceId,
        fetchedAt: day,
        kind: v.boostBudgetEur > 0 ? "paid" : "organic",
        reach,
        impressions,
        views: impressions,
        likes,
        comments,
        shares,
        saves,
        completionRate: 45 + (seed % 30),
        hookRate: 35 + (seed % 25),
        holdRate: 25 + (seed % 25),
        spendCents:
          v.boostBudgetEur > 0
            ? Math.round((v.boostBudgetEur * 100) / Math.max(v.boostDurationDays ?? 1, 1))
            : null,
        cpmCents: v.boostBudgetEur > 0 ? 300 + (seed % 200) : null,
      };
      if (existing) {
        await prisma.metric.update({ where: { id: existing.id }, data });
      } else {
        await prisma.metric.create({ data });
      }
      written++;
    }
  }

  return { variants: variants.length, metrics: written };
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
