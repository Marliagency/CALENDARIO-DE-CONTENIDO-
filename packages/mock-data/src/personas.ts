import type { BuyerPersona } from "@pulse/types";

export const personas: BuyerPersona[] = [
  {
    id: "persona-optimizador",
    workspaceId: "ws-qyro",
    name: "El Optimizador Consciente",
    ageRange: "22-38",
    demographics: "Urbano, ingresos medios-altos, soltero o pareja sin hijos, alfabetizado digitalmente.",
    dailyContext: "Usa Apple Watch o equivalente, escucha podcasts, hace meal-prep, gym 3–5 veces/sem.",
    pains: [
      "Tiene 5+ apps que no usa todas",
      "Abandona hábitos a las 2 semanas",
      "No ve resultados globales pese a hacer cosas",
    ],
    jtbdFunctional: "Ver en un solo lugar si mi semana ha ido bien.",
    jtbdEmotional: "Sentir que voy a algún sitio, no que doy vueltas.",
    jtbdSocial: "Poder enseñar mi progreso sin compararme con otros.",
    objections: [
      "Otra app más, no gracias",
      "¿Y qué pasa con mis datos?",
      "Suena a Notion para fitness",
    ],
    workingHooks: [
      "POV: 5 apps y ninguna te dice si vas bien",
      "Mi Life Score subió 40 puntos en 6 semanas",
      "Llevo 3 años intentando hacer esto manualmente",
    ],
    promise: "Un único número que te dice si tu vida está mejorando.",
    proof: "Patrones, no promesas. Tus datos, tu progreso.",
    preferredCta: "Pruébalo 14 días sin tarjeta",
    preferredPlatforms: ["tiktok", "instagram"],
    isProTarget: false,
    notes: "Persona principal Q3 2026.",
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-04-20T16:30:00Z",
  },
  {
    id: "persona-transicion",
    workspaceId: "ws-qyro",
    name: "La Persona en Transición",
    ageRange: "28-45",
    demographics: "En cambio vital (mudanza, separación, hijos, nuevo trabajo). Ingresos medios.",
    dailyContext: "Saturado mentalmente, intenta volver al gym, prueba apps esporádicamente.",
    pains: [
      "No sé por dónde empezar",
      "Ya intenté el gym 3 veces este año",
      "Me agobia abrir Notion vacío",
    ],
    jtbdFunctional: "Saber qué hacer mañana sin pensarlo.",
    jtbdEmotional: "Sentirme acompañado sin necesidad de un coach.",
    jtbdSocial: "Que no se note que estoy perdido.",
    objections: [
      "No tengo tiempo para meter datos",
      "Otra app de productividad no",
    ],
    workingHooks: [
      "Si tu vida es un caos, esto puede ayudar",
      "No necesitas un coach. Necesitas estructura.",
    ],
    promise: "Estructura clara para empezar mañana.",
    proof: "Onboarding de 5 min, primer plan en 24h.",
    preferredCta: "Empieza con un plan en 5 minutos",
    preferredPlatforms: ["instagram", "facebook"],
    isProTarget: true,
    notes: "Mejor conversión a Pro. Plataforma principal: IG.",
    createdAt: "2026-01-15T10:30:00Z",
    updatedAt: "2026-04-20T16:30:00Z",
  },
];

export function personasForWorkspace(workspaceId: string): BuyerPersona[] {
  return personas.filter((p) => p.workspaceId === workspaceId);
}
