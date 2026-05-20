/**
 * Generador de métricas dummy para variants publicadas.
 *
 * En production esto lo sustituyen los pull workers que llaman a la Graph API,
 * TikTok Display API, YouTube Analytics, etc. Por ahora rellena la tabla
 * Metric con valores plausibles para que los dashboards muestren datos.
 *
 * Idempotente: si la variant ya tiene métricas del día, las actualiza.
 */

import { prisma } from "../db.js";

export async function generateDummyMetricsForWorkspace(workspaceId: string) {
  const variants = await prisma.platformVariant.findMany({
    where: {
      workspaceId,
      status: { in: ["published", "scheduled"] },
    },
  });

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  for (const v of variants) {
    const seed = hashSeed(v.id);
    const reach = 1500 + (seed % 9000);
    const impressions = Math.round(reach * 1.4);
    const engagement = (reach * (2 + (seed % 4))) / 100;
    const likes = Math.round(engagement * 0.65);
    const comments = Math.round(engagement * 0.08);
    const shares = Math.round(engagement * 0.10);
    const saves = Math.round(engagement * 0.17);

    // Upsert por (variant, día)
    const existing = await prisma.metric.findFirst({
      where: {
        platformVariantId: v.id,
        fetchedAt: { gte: new Date(today.toISOString().slice(0, 10)) },
      },
    });
    const data = {
      platformVariantId: v.id,
      workspaceId,
      fetchedAt: today,
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
      spendCents: v.boostBudgetEur > 0 ? Math.round(v.boostBudgetEur * 100) : null,
      cpmCents: v.boostBudgetEur > 0 ? 300 + (seed % 200) : null,
    };
    if (existing) {
      await prisma.metric.update({ where: { id: existing.id }, data });
    } else {
      await prisma.metric.create({ data });
    }
  }

  return variants.length;
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
