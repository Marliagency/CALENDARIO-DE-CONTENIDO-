import type { Hook } from "@pulse/types";

export const hooks: Hook[] = [
  {
    id: "hook-1",
    workspaceId: "ws-qyro",
    text: "POV: tienes 5 apps y ninguna te dice si vas bien",
    personaId: "persona-optimizador",
    format: "ugc_video",
    hypothesis: "El POV pega bien en TikTok para audiencia 22-38.",
    testedAt: "2026-05-12T09:00:00Z",
    contentPieceId: "piece-8",
    resultNotes: "120k views, 4.8% engagement. Mejor hook del Q1.",
    createdAt: "2026-05-01T10:00:00Z",
  },
  {
    id: "hook-2",
    workspaceId: "ws-qyro",
    text: "Mi Life Score subió 40 puntos en 6 semanas",
    personaId: "persona-optimizador",
    format: "ugc_video",
    hypothesis: "Testimonial concreto convierte mejor que abstracto.",
    testedAt: "2026-05-15T11:00:00Z",
    contentPieceId: "piece-7",
    resultNotes: "Engagement 3.6%, buen save rate.",
    createdAt: "2026-05-10T10:00:00Z",
  },
  {
    id: "hook-3",
    workspaceId: "ws-qyro",
    text: "Si tu vida es un caos, esto puede ayudar",
    personaId: "persona-transicion",
    format: "lifestyle_ad",
    hypothesis: "Hook directo para persona en transición.",
    createdAt: "2026-05-18T10:00:00Z",
  },
];

export function hooksForWorkspace(workspaceId: string): Hook[] {
  return hooks.filter((h) => h.workspaceId === workspaceId);
}
