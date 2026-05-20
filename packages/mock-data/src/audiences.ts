import type { AudiencePreset } from "@pulse/types";

export const audiencePresets: AudiencePreset[] = [
  {
    id: "audience-qyro-es-optim",
    workspaceId: "ws-qyro",
    name: "ES — Optimizador 22-38",
    platform: "tiktok",
    geo: ["ES"],
    ageMin: 22,
    ageMax: 38,
    languages: ["es"],
    interests: ["fitness", "productividad", "tech", "wellness"],
  },
  {
    id: "audience-qyro-es-transi",
    workspaceId: "ws-qyro",
    name: "ES — Transición 28-45",
    platform: "instagram",
    geo: ["ES"],
    ageMin: 28,
    ageMax: 45,
    languages: ["es"],
    interests: ["mindfulness", "self-help", "psicología"],
  },
  {
    id: "audience-qyro-latam",
    workspaceId: "ws-qyro",
    name: "LATAM — Optimizador",
    platform: "tiktok",
    geo: ["MX", "AR", "CO", "CL"],
    ageMin: 22,
    ageMax: 38,
    languages: ["es"],
    interests: ["fitness", "productividad"],
  },
];

export function audiencesForWorkspace(workspaceId: string): AudiencePreset[] {
  return audiencePresets.filter((a) => a.workspaceId === workspaceId);
}
