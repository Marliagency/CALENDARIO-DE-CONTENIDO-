import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const QYRO_ID = "ws-qyro";
const PERSONAL_ID = "ws-personal";
const USER_ID = "user-diego";

async function main() {
  console.log("Seeding Pulse database (full)...");

  // ----- User -----
  const user = await prisma.user.upsert({
    where: { email: "diego@qyro.app" },
    update: {},
    create: { id: USER_ID, email: "diego@qyro.app", name: "Diego" },
  });

  // ----- Workspaces -----
  const qyro = await prisma.workspace.upsert({
    where: { slug: "qyro" },
    update: {},
    create: {
      id: QYRO_ID,
      slug: "qyro",
      name: "QYRO",
      type: "brand",
      description:
        "Sistema operativo personal — app móvil que centraliza vida, salud, hábitos y finanzas.",
      brandColorPrimary: "#3B82F6",
      brandColorSecondary: "#7C5CFC",
      defaultTimezone: "Europe/Madrid",
      createdById: user.id,
      sortOrder: 0,
      members: {
        create: { userId: user.id, role: "owner", acceptedAt: new Date() },
      },
    },
  });

  const personal = await prisma.workspace.upsert({
    where: { slug: "personal" },
    update: {},
    create: {
      id: PERSONAL_ID,
      slug: "personal",
      name: "Diego Personal",
      type: "personal",
      brandColorPrimary: "#64748B",
      brandColorSecondary: "#94A3B8",
      defaultTimezone: "Europe/Madrid",
      createdById: user.id,
      sortOrder: 1,
      members: {
        create: { userId: user.id, role: "owner", acceptedAt: new Date() },
      },
    },
  });

  // ----- Brand Brain QYRO -----
  await prisma.brandBrain.upsert({
    where: { workspaceId: qyro.id },
    update: {},
    create: {
      workspaceId: qyro.id,
      productDescription:
        "QYRO es una app móvil que funciona como tu sistema operativo personal. Reúne en un solo sitio salud, hábitos, finanzas, productividad y bienestar mental, con un Life Score que mide tu progreso global.",
      taglineMain: "Tu sistema operativo personal",
      taglinesAlt: JSON.stringify([
        "Una sola app que entiende tu vida entera",
        "Mide. Mejora. Repite.",
      ]),
      problemSolved:
        "La mayoría tiene 5+ apps distintas y ninguna les dice si globalmente están mejorando.",
      uniqueValueProp:
        "Una sola app que entiende tu vida entera y te dice, con un solo número, si vas bien.",
      whatWeAreNot: JSON.stringify([
        "No somos otra app de fitness",
        "No somos un tracker de hábitos más",
        "No somos una app financiera",
      ]),
      competitors: JSON.stringify([
        { name: "Notion", differentiator: "Notion es vacío; QYRO viene con estructura." },
        { name: "Strava", differentiator: "Strava solo mide actividad física." },
      ]),
      brandAdjectives: JSON.stringify(["calmado", "premium", "inteligente", "directo"]),
      howWeTalk: "Frases cortas. Tono adulto, sin emojis sobre-usados.",
      claimsAllowed: JSON.stringify([
        "Integra datos de Apple Health, Google Fit y tu banco",
        "Te da un único Life Score basado en tus datos",
      ]),
      claimsForbidden: JSON.stringify([
        "Te ayuda a perder X kilos",
        "Sincronizado en la nube",
        "Compatible con Apple Watch",
      ]),
      disclaimersRequired: JSON.stringify([
        "QYRO no sustituye consejo médico, financiero o psicológico profesional.",
      ]),
    },
  });

  await prisma.brandBrain.upsert({
    where: { workspaceId: personal.id },
    update: {},
    create: { workspaceId: personal.id },
  });

  // ----- Buyer Personas -----
  const optim = await prisma.buyerPersona.upsert({
    where: { id: "persona-optimizador" },
    update: {},
    create: {
      id: "persona-optimizador",
      workspaceId: qyro.id,
      name: "El Optimizador Consciente",
      ageRange: "22-38",
      demographics: "Urbano, ingresos medios-altos, alfabetizado digitalmente.",
      pains: JSON.stringify([
        "Tiene 5+ apps que no usa todas",
        "Abandona hábitos a las 2 semanas",
      ]),
      jtbdFunctional: "Ver en un solo lugar si mi semana ha ido bien.",
      jtbdEmotional: "Sentir que voy a algún sitio, no que doy vueltas.",
      workingHooks: JSON.stringify([
        "POV: 5 apps y ninguna te dice si vas bien",
        "Mi Life Score subió 40 puntos en 6 semanas",
      ]),
      preferredPlatforms: JSON.stringify(["tiktok", "instagram"]),
    },
  });

  const transicion = await prisma.buyerPersona.upsert({
    where: { id: "persona-transicion" },
    update: {},
    create: {
      id: "persona-transicion",
      workspaceId: qyro.id,
      name: "La Persona en Transición",
      ageRange: "28-45",
      demographics: "En cambio vital. Ingresos medios.",
      pains: JSON.stringify([
        "No sé por dónde empezar",
        "Ya intenté el gym 3 veces este año",
      ]),
      isProTarget: true,
      preferredPlatforms: JSON.stringify(["instagram", "facebook"]),
    },
  });

  // ----- Social accounts QYRO -----
  const accountsData = [
    {
      id: "acc-qyro-ig-app",
      workspaceId: qyro.id,
      platform: "instagram",
      nickname: "IG QYRO",
      handle: "@qyro_app",
      activeFormats: JSON.stringify(["feed_photo", "feed_video", "reel", "carousel"]),
      isAdsEnabled: true,
      status: "healthy",
      tokenExpiresAt: new Date("2026-07-20"),
      lastPublishedAt: new Date("2026-05-20T11:00:00Z"),
    },
    {
      id: "acc-qyro-tt-app",
      workspaceId: qyro.id,
      platform: "tiktok",
      nickname: "TikTok QYRO",
      handle: "@qyro_app",
      activeFormats: JSON.stringify(["feed_video"]),
      isAdsEnabled: true,
      status: "healthy",
      platformAdvertiserId: "tt-adv-12345",
      lastPublishedAt: new Date("2026-05-20T09:00:00Z"),
    },
    {
      id: "acc-qyro-tt-latam",
      workspaceId: qyro.id,
      platform: "tiktok",
      nickname: "TikTok QYRO LATAM",
      handle: "@qyro_latam",
      activeFormats: JSON.stringify(["feed_video"]),
      status: "healthy",
    },
    {
      id: "acc-qyro-fb-page",
      workspaceId: qyro.id,
      platform: "facebook",
      nickname: "Facebook Page QYRO",
      handle: "QYRO",
      activeFormats: JSON.stringify(["post", "feed_video", "reel"]),
      isAdsEnabled: true,
      status: "needs_reauth",
      tokenExpiresAt: new Date("2026-05-23"),
      lastError: "Token expira en 3 días",
    },
    {
      id: "acc-personal-tt",
      workspaceId: personal.id,
      platform: "tiktok",
      nickname: "TikTok Diego",
      handle: "@diego_xyz",
      activeFormats: JSON.stringify(["feed_video"]),
      status: "healthy",
    },
    {
      id: "acc-personal-ig",
      workspaceId: personal.id,
      platform: "instagram",
      nickname: "IG Diego Personal",
      handle: "@diego.personal",
      activeFormats: JSON.stringify(["feed_photo", "reel", "story"]),
      status: "rate_limited",
      lastError: "Cuota Instagram al 92%",
    },
  ];
  for (const acc of accountsData) {
    await prisma.socialAccount.upsert({
      where: { id: acc.id },
      update: {},
      create: acc,
    });
  }

  // ----- Campaigns -----
  await prisma.campaign.upsert({
    where: { id: "campaign-q3" },
    update: {},
    create: {
      id: "campaign-q3",
      workspaceId: qyro.id,
      name: "Lanzamiento Q3 2026",
      objective: "awareness",
      startAt: new Date("2026-05-01"),
      endAt: new Date("2026-09-30"),
      kpiName: "Alcance acumulado",
      kpiTarget: 500_000,
      status: "active",
    },
  });

  // ----- Audience presets -----
  await prisma.audiencePreset.upsert({
    where: { id: "audience-qyro-es-optim" },
    update: {},
    create: {
      id: "audience-qyro-es-optim",
      workspaceId: qyro.id,
      name: "ES — Optimizador 22-38",
      platform: "tiktok",
      geo: JSON.stringify(["ES"]),
      ageMin: 22,
      ageMax: 38,
      languages: JSON.stringify(["es"]),
      interests: JSON.stringify(["fitness", "productividad", "tech"]),
    },
  });

  // ----- Content pieces + variants -----
  const piece1 = await prisma.contentPiece.upsert({
    where: { id: "piece-1" },
    update: {},
    create: {
      id: "piece-1",
      workspaceId: qyro.id,
      externalRef: "creative-run-001",
      title: "Hook del lunes — POV 5 apps",
      format: "ugc_video",
      targetAccounts: JSON.stringify(["acc-qyro-tt-app", "acc-qyro-ig-app"]),
      buyerPersonaId: optim.id,
      campaignId: "campaign-q3",
      hookUsed: "POV: tienes 5 apps...",
      status: "in_review",
      source: "studio",
    },
  });

  await prisma.platformVariant.upsert({
    where: { id: "var-1-tt" },
    update: {},
    create: {
      id: "var-1-tt",
      contentPieceId: piece1.id,
      workspaceId: qyro.id,
      socialAccountId: "acc-qyro-tt-app",
      platform: "tiktok",
      mediaUrl: "https://example.com/video.mp4",
      ratio: "9:16",
      durationS: 22,
      caption: "POV: tienes 5 apps y ninguna te dice si vas bien.",
      hashtags: JSON.stringify(["productividad", "lifestyle"]),
      boostEnabled: true,
      boostBudgetEur: 6,
      boostDurationDays: 3,
      boostDailyBudgetEur: 2,
      scheduledAt: new Date("2026-05-23T19:00:00Z"),
    },
  });

  // API key para SESIÓN 2 (con hash sha256 conocido para tests)
  // sk_ws_a8f3c9d1_KNOWN_TEST_KEY -> hash determinista
  const crypto = await import("node:crypto");
  const testToken = "sk_ws_a8f3c9d1_DEMO";
  const testHash = crypto.createHash("sha256").update(testToken).digest("hex");
  await prisma.workspaceApiKey.upsert({
    where: { id: "key-demo" },
    update: { keyHash: testHash },
    create: {
      id: "key-demo",
      workspaceId: qyro.id,
      name: "SESIÓN 2 demo key",
      keyHash: testHash,
      keyPrefix: "sk_ws_a8f3c9d1",
      scopes: JSON.stringify(["ingest", "read_brain"]),
    },
  });

  console.log(`Seeded:
  - 1 user (${user.email})
  - 2 workspaces (qyro, personal)
  - 2 buyer personas
  - 6 social accounts (multi-cuenta por plataforma)
  - 1 campaign
  - 1 audience preset
  - 1 content piece + 1 variant
  - 1 API key (demo): ${testToken}
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
