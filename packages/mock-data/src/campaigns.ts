import type { Campaign } from "@pulse/types";

export const campaigns: Campaign[] = [
  {
    id: "campaign-q3",
    workspaceId: "ws-qyro",
    name: "Lanzamiento Q3 2026",
    objective: "awareness",
    startAt: "2026-05-01T00:00:00Z",
    endAt: "2026-09-30T00:00:00Z",
    kpiName: "Alcance acumulado",
    kpiTarget: 500_000,
    notes: "Campaña de lanzamiento de la versión 2.0 con Life Score avanzado.",
    status: "active",
  },
  {
    id: "campaign-pro",
    workspaceId: "ws-qyro",
    name: "Conversión a Pro",
    objective: "conversion",
    startAt: "2026-04-15T00:00:00Z",
    endAt: "2026-12-31T00:00:00Z",
    kpiName: "Suscripciones Pro",
    kpiTarget: 200,
    status: "active",
  },
];

export function campaignsForWorkspace(workspaceId: string): Campaign[] {
  return campaigns.filter((c) => c.workspaceId === workspaceId);
}
