import type { BrandAsset, BrandBrain } from "@pulse/types";

export const brandBrains: BrandBrain[] = [
  {
    id: "brain-qyro",
    workspaceId: "ws-qyro",
    productDescription:
      "QYRO es una app móvil que funciona como tu sistema operativo personal. Reúne en un solo sitio salud, hábitos, finanzas, productividad y bienestar mental, con un Life Score que mide tu progreso global y aprende de tus patrones para sugerirte el siguiente paso sin saturarte.",
    taglineMain: "Tu sistema operativo personal",
    taglinesAlt: [
      "Una sola app que entiende tu vida entera",
      "Mide. Mejora. Repite.",
      "El centro de mando de tu vida diaria",
    ],
    problemSolved:
      "La mayoría de personas tiene 5–8 apps distintas (Strava, MyFitnessPal, Notion, banca, meditación...) y ninguna les dice si globalmente están mejorando o no. Hay ruido, no señal.",
    uniqueValueProp:
      "Una sola app que entiende tu vida entera y te dice, con un solo número (Life Score), si vas bien.",
    whatWeAreNot: [
      "No somos otra app de fitness",
      "No somos un tracker de hábitos más",
      "No somos una app financiera",
      "No vendemos coaching humano",
    ],
    competitors: [
      { name: "Notion", differentiator: "Notion es vacío; QYRO viene con estructura y datos automáticos." },
      { name: "Strava", differentiator: "Strava solo mide actividad física; QYRO mide tu vida entera." },
      { name: "Apple Health", differentiator: "Apple Health agrega datos; QYRO los traduce en decisiones." },
    ],
    techStackNotes: "App nativa iOS/Android. Sync con Apple Health, Google Fit, Open Banking (PSD2).",
    pricingNotes: "Freemium. Pro a 4,99€/mes con Life Score avanzado, integraciones premium y AI Coach.",
    monetizationNotes: "Foco en conversión a Pro, no en publicidad. Trial 14 días, sin tarjeta.",
    brandAdjectives: ["calmado", "premium", "inteligente", "directo", "sin ruido"],
    howWeTalk:
      "Frases cortas. Tono adulto, sin emojis sobre-usados. Nunca prometemos resultados imposibles. Hablamos de patrones, no de promesas mágicas.",
    howWeDontTalk: [
      "No usamos exclamaciones múltiples",
      "No prometemos transformaciones en X días",
      "No usamos jerga fitness o tech bro",
      "No abusamos de emojis (máx 1 por post)",
    ],
    copyApprovedExamples: [
      {
        text: "POV: 5 apps y ninguna te dice si vas bien.",
        platform: "tiktok",
        notes: "Hook que mejor convierte para persona Optimizador.",
      },
      {
        text: "Mi Life Score subió 40 puntos en 6 semanas. Sin tocar el gym.",
        platform: "instagram",
        notes: "Testimonial-style, funciona en Reel.",
      },
    ],
    copyRejectedExamples: [
      {
        text: "¡¡Cambia tu vida en 7 días con QYRO!! 🔥🔥🔥",
        reason: "Tono hype, promesa imposible, exceso de emojis.",
      },
    ],
    claimsAllowed: [
      "Integra datos de Apple Health, Google Fit y tu banco",
      "Te da un único Life Score basado en tus datos",
      "Aprende de tus patrones para sugerir el siguiente paso",
    ],
    claimsForbidden: [
      "Te ayuda a perder X kilos",
      "Sincronizado en la nube",
      "Compatible con Apple Watch",
      "Curamos tu ansiedad",
    ],
    disclaimersRequired: [
      "QYRO no sustituye consejo médico, financiero o psicológico profesional.",
    ],
    updatedAt: "2026-05-18T14:23:00Z",
    updatedBy: "user-diego",
  },
  {
    id: "brain-personal",
    workspaceId: "ws-personal",
    productDescription: "",
    taglineMain: "",
    taglinesAlt: [],
    problemSolved: "",
    uniqueValueProp: "",
    whatWeAreNot: [],
    competitors: [],
    brandAdjectives: ["honesto", "cercano"],
    howWeTalk: "Primera persona, sin filtros corporativos.",
    howWeDontTalk: [],
    copyApprovedExamples: [],
    copyRejectedExamples: [],
    claimsAllowed: [],
    claimsForbidden: [],
    disclaimersRequired: [],
    updatedAt: "2026-02-03T18:30:00Z",
  },
];

export function brainForWorkspace(workspaceId: string): BrandBrain | undefined {
  return brandBrains.find((b) => b.workspaceId === workspaceId);
}

export const brandAssets: BrandAsset[] = [
  {
    id: "asset-qyro-logo-1",
    workspaceId: "ws-qyro",
    section: "logo",
    name: "Logo QYRO (isotipo azul)",
    description: "Versión principal del isotipo en azul corporativo.",
    fileUrl: "/mock-assets/qyro-logo-blue.svg",
    fileType: "image/svg+xml",
    fileSizeBytes: 4521,
    thumbnailUrl: "/mock-assets/qyro-logo-blue.svg",
    tags: ["logo", "isotipo"],
    metadata: {},
    sortOrder: 0,
    createdBy: "user-diego",
    createdAt: "2026-01-12T10:00:00Z",
    updatedAt: "2026-01-12T10:00:00Z",
  },
  {
    id: "asset-qyro-screenshot-1",
    workspaceId: "ws-qyro",
    section: "screenshot",
    name: "Pantalla Life Score",
    description: "Captura del Dashboard principal mostrando el Life Score 78.",
    fileUrl: "/mock-assets/qyro-screenshot-1.png",
    fileType: "image/png",
    fileSizeBytes: 412000,
    thumbnailUrl: "/mock-assets/qyro-screenshot-1.png",
    tags: ["dashboard", "life-score"],
    metadata: { module: "dashboard", feature: "life-score" },
    sortOrder: 0,
    createdAt: "2026-03-04T11:20:00Z",
    updatedAt: "2026-03-04T11:20:00Z",
  },
  {
    id: "asset-qyro-doc-1",
    workspaceId: "ws-qyro",
    section: "document",
    name: "Análisis competitivo Q1 2026.pdf",
    description: "Estudio comparativo Notion / Strava / Apple Health vs QYRO.",
    fileUrl: "/mock-assets/qyro-competitive-analysis.pdf",
    fileType: "application/pdf",
    fileSizeBytes: 2_400_000,
    tags: ["competidores", "estrategia"],
    metadata: {
      doc_type: "análisis de producto",
      summary:
        "Documento de 22 páginas que compara QYRO con Notion, Strava y Apple Health. Conclusión: QYRO ocupa un espacio único como agregador-con-criterio. Las tres alternativas o son vacías (Notion), o son verticales (Strava), o son pasivas (Apple Health).",
    },
    sortOrder: 0,
    createdAt: "2026-02-20T15:00:00Z",
    updatedAt: "2026-02-20T15:00:00Z",
  },
  {
    id: "asset-qyro-ad-1",
    workspaceId: "ws-qyro",
    section: "ad_own",
    name: "Reel 'POV 5 apps'",
    description: "Mejor pieza Q1: 120k views, 4.8% engagement.",
    fileUrl: "/mock-assets/qyro-reel-pov-5-apps.mp4",
    fileType: "video/mp4",
    fileSizeBytes: 8_900_000,
    thumbnailUrl: "/mock-assets/qyro-reel-thumb.jpg",
    tags: ["pov", "tiktok", "ganador"],
    metadata: {
      platform: "tiktok",
      hook_used: "POV: 5 apps y ninguna te dice si vas bien",
      persona_id: "persona-optimizador",
      result_notes: "Mejor hook del Q1. Replicar formato.",
    },
    sortOrder: 0,
    createdAt: "2026-03-15T12:00:00Z",
    updatedAt: "2026-03-15T12:00:00Z",
  },
  {
    id: "asset-qyro-ref-1",
    workspaceId: "ws-qyro",
    section: "ad_reference",
    name: "Linear — landing 2025",
    description: "Referencia de tono calmado + dark mode premium.",
    fileUrl: "https://linear.app",
    tags: ["referencia", "premium", "tono"],
    metadata: {
      source_url: "https://linear.app",
      what_works: "Hero limpio, demo concreta, sin hype.",
      what_doesnt: "Demasiado B2B, nosotros somos consumer.",
    },
    sortOrder: 0,
    createdAt: "2026-02-10T09:00:00Z",
    updatedAt: "2026-02-10T09:00:00Z",
  },
];

export function assetsForWorkspace(workspaceId: string): BrandAsset[] {
  return brandAssets.filter((a) => a.workspaceId === workspaceId);
}
