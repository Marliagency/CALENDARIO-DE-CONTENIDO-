import type { Metric } from "@pulse/types";

// Datos de los últimos 7 días para gráficas del dashboard
export interface DailyMetric {
  date: string;
  workspaceId: string;
  reach: number;
  impressions: number;
  engagementRate: number;
  publishedCount: number;
  boostSpendEur: number;
}

export const dailyMetrics: DailyMetric[] = [
  // QYRO últimos 7 días
  { date: "2026-05-14", workspaceId: "ws-qyro", reach: 5200, impressions: 8100, engagementRate: 3.2, publishedCount: 2, boostSpendEur: 1.5 },
  { date: "2026-05-15", workspaceId: "ws-qyro", reach: 6800, impressions: 10200, engagementRate: 3.8, publishedCount: 3, boostSpendEur: 2.0 },
  { date: "2026-05-16", workspaceId: "ws-qyro", reach: 5100, impressions: 7800, engagementRate: 2.9, publishedCount: 1, boostSpendEur: 0.5 },
  { date: "2026-05-17", workspaceId: "ws-qyro", reach: 4900, impressions: 7400, engagementRate: 3.1, publishedCount: 1, boostSpendEur: 0 },
  { date: "2026-05-18", workspaceId: "ws-qyro", reach: 7300, impressions: 11100, engagementRate: 3.6, publishedCount: 2, boostSpendEur: 1.5 },
  { date: "2026-05-19", workspaceId: "ws-qyro", reach: 8200, impressions: 12500, engagementRate: 4.1, publishedCount: 2, boostSpendEur: 2.0 },
  { date: "2026-05-20", workspaceId: "ws-qyro", reach: 7700, impressions: 11900, engagementRate: 3.4, publishedCount: 1, boostSpendEur: 1.0 },
  // Personal
  { date: "2026-05-14", workspaceId: "ws-personal", reach: 800, impressions: 1200, engagementRate: 4.5, publishedCount: 0, boostSpendEur: 0 },
  { date: "2026-05-15", workspaceId: "ws-personal", reach: 1100, impressions: 1700, engagementRate: 5.1, publishedCount: 1, boostSpendEur: 0 },
  { date: "2026-05-16", workspaceId: "ws-personal", reach: 1800, impressions: 2400, engagementRate: 5.8, publishedCount: 1, boostSpendEur: 0 },
  { date: "2026-05-17", workspaceId: "ws-personal", reach: 900, impressions: 1300, engagementRate: 4.2, publishedCount: 0, boostSpendEur: 0 },
  { date: "2026-05-18", workspaceId: "ws-personal", reach: 1500, impressions: 2100, engagementRate: 5.5, publishedCount: 1, boostSpendEur: 0 },
  { date: "2026-05-19", workspaceId: "ws-personal", reach: 1200, impressions: 1700, engagementRate: 4.9, publishedCount: 0, boostSpendEur: 0 },
  { date: "2026-05-20", workspaceId: "ws-personal", reach: 800, impressions: 1100, engagementRate: 4.6, publishedCount: 0, boostSpendEur: 0 },
];

export interface AccountMetric {
  socialAccountId: string;
  workspaceId: string;
  reach: number;
  engagement: number;
  publishedCount: number;
  organicReach: number;
  paidReach: number;
}

export const accountMetrics: AccountMetric[] = [
  { socialAccountId: "acc-qyro-ig-app", workspaceId: "ws-qyro", reach: 18200, engagement: 720, publishedCount: 5, organicReach: 13200, paidReach: 5000 },
  { socialAccountId: "acc-qyro-tt-app", workspaceId: "ws-qyro", reach: 22400, engagement: 1180, publishedCount: 4, organicReach: 16400, paidReach: 6000 },
  { socialAccountId: "acc-qyro-tt-latam", workspaceId: "ws-qyro", reach: 3400, engagement: 180, publishedCount: 2, organicReach: 3400, paidReach: 0 },
  { socialAccountId: "acc-qyro-fb-page", workspaceId: "ws-qyro", reach: 1200, engagement: 35, publishedCount: 1, organicReach: 1200, paidReach: 0 },
  { socialAccountId: "acc-personal-tt", workspaceId: "ws-personal", reach: 5200, engagement: 290, publishedCount: 2, organicReach: 5200, paidReach: 0 },
  { socialAccountId: "acc-personal-ig", workspaceId: "ws-personal", reach: 2400, engagement: 145, publishedCount: 1, organicReach: 2400, paidReach: 0 },
  { socialAccountId: "acc-personal-yt", workspaceId: "ws-personal", reach: 480, engagement: 25, publishedCount: 0, organicReach: 480, paidReach: 0 },
];

export interface FormatMetric {
  workspaceId: string;
  format: string;
  avgReach: number;
  avgEngagementRate: number;
  avgCompletionRate: number;
  cpmCents?: number;
  count: number;
}

export const formatMetrics: FormatMetric[] = [
  { workspaceId: "ws-qyro", format: "UGC Video", avgReach: 8200, avgEngagementRate: 4.2, avgCompletionRate: 64, cpmCents: 380, count: 8 },
  { workspaceId: "ws-qyro", format: "App Demo", avgReach: 5400, avgEngagementRate: 3.1, avgCompletionRate: 58, cpmCents: 420, count: 5 },
  { workspaceId: "ws-qyro", format: "Carrusel", avgReach: 3200, avgEngagementRate: 3.8, avgCompletionRate: 0, count: 4 },
  { workspaceId: "ws-qyro", format: "Lifestyle Ad", avgReach: 6800, avgEngagementRate: 3.5, avgCompletionRate: 71, cpmCents: 340, count: 3 },
  { workspaceId: "ws-qyro", format: "Imagen", avgReach: 1800, avgEngagementRate: 2.1, avgCompletionRate: 0, count: 6 },
  { workspaceId: "ws-personal", format: "UGC Video", avgReach: 3200, avgEngagementRate: 5.1, avgCompletionRate: 68, count: 4 },
  { workspaceId: "ws-personal", format: "Imagen", avgReach: 1800, avgEngagementRate: 4.6, avgCompletionRate: 0, count: 3 },
  { workspaceId: "ws-personal", format: "Short", avgReach: 480, avgEngagementRate: 4.2, avgCompletionRate: 72, count: 1 },
];

export function dailyMetricsForWorkspace(workspaceId: string): DailyMetric[] {
  return dailyMetrics.filter((m) => m.workspaceId === workspaceId);
}

export function accountMetricsForWorkspace(workspaceId: string): AccountMetric[] {
  return accountMetrics.filter((m) => m.workspaceId === workspaceId);
}

export function formatMetricsForWorkspace(workspaceId: string): FormatMetric[] {
  return formatMetrics.filter((m) => m.workspaceId === workspaceId);
}
