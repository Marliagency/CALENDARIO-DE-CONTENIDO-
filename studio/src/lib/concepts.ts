// Concept proposer. Given a brief, produces three distinct content angles so
// the user can pick before generation burns any credits.
//
// In a real Claude Code session the chat agent picks the hooks and angles
// freely; this module is the deterministic fallback (and provides the type
// contract both code paths share). The agent should mutate / replace the
// strings but keep the shape so QC and the rest of the pipeline stay valid.

import type { Brief, Concept, Format, Platform } from "../types.js";

function clamp<T>(arr: T[], n: number): T[] {
  return arr.slice(0, n);
}

function defaultStructureFor(format: Format): string {
  switch (format) {
    case "ugc_video":
      return "UGC 15s — talking head + B-roll + CTA en pantalla";
    case "lifestyle_ad":
      return "Lifestyle 20s — escena cinematográfica + tagline + logo lockup";
    case "app_demo":
    case "ui_demo":
      return "App demo 20s — onboarding rápido + 1 feature destacado";
    case "motion_graphic":
    case "data_animation":
      return "Motion graphic 12s — dato animado + insight + CTA";
    case "text_video":
      return "Texto animado 8s — hook tipográfico + tagline";
    case "carousel":
    case "canva_design":
      return "Carrusel 5 slides — hook · 3 puntos · CTA";
    case "image":
      return "Imagen estática 1:1 — visual + headline corto";
    case "voiceover":
      return "Narración 30s para acompañar vídeo gráfico";
    default:
      return "Pieza estándar adaptada a plataforma";
  }
}

function pickHook(brief: Brief, index: number): string {
  const persona = brief.persona;
  const libraryHooks = clamp(brief.hooks.map((h) => h.text), 5);
  const personaHooks = clamp(persona.workingHooks ?? [], 5);
  const all = [...libraryHooks, ...personaHooks];
  if (all.length === 0) {
    // synthesize from persona pain
    const pain = persona.pains[0] ?? "esto que llevas tiempo intentando";
    return `Si te pasa que ${pain.toLowerCase()}, mira esto.`;
  }
  return all[index % all.length];
}

function competitorAngle(brief: Brief): string | null {
  const competitor = brief.references.adReferences?.[0];
  if (competitor) {
    const meta = competitor.metadata as Record<string, unknown> | undefined;
    const what = (meta?.what_works as string) ?? null;
    if (what) return `Inspirado en "${competitor.name}" — replicamos: ${what}`;
  }
  if (brief.brand.uvp) {
    return `Postura: lo nuestro es ${brief.brand.uvp.toLowerCase()}, no lo que hacen los demás.`;
  }
  return null;
}

function platformsForFormat(brief: Brief, format: Format): Platform[] {
  if (brief.targetPlatforms.length > 0) return brief.targetPlatforms;
  if (format === "image" || format === "carousel") return ["instagram_feed"];
  return ["tiktok", "instagram_reel"];
}

export function proposeConcepts(brief: Brief): Concept[] {
  const format = brief.format;
  const platforms = platformsForFormat(brief, format);
  const pains = brief.persona.pains;
  const claim = brief.brand.claimsAllowed[0] ?? brief.brand.uvp ?? brief.brand.tagline;
  const competitor = competitorAngle(brief);

  const concepts: Concept[] = [
    {
      index: 1,
      title: `Pain-first — ${brief.persona.name}`,
      hook: pickHook(brief, 0),
      angle: pains[0]
        ? `Arranca con el dolor "${pains[0]}", lo nombra textual, y resuelve con la promesa central.`
        : "Arranca con el dolor más reconocible de la persona y resuelve con la promesa central.",
      structure: defaultStructureFor(format),
      platforms,
      centralClaim: claim,
    },
    {
      index: 2,
      title: `Demo / how-it-works — ${brief.persona.name}`,
      hook: pickHook(brief, 1),
      angle:
        "Enseña el producto en uso (mockup o footage real) durante los primeros 5s; el copy descubre el beneficio funcional.",
      structure: defaultStructureFor(
        format === "ugc_video" ? "app_demo" : format,
      ),
      platforms,
      centralClaim: claim,
    },
    {
      index: 3,
      title: "Reposicionamiento vs alternativas",
      hook: pickHook(brief, 2),
      angle:
        competitor ??
        "Compara contra la solución por defecto (Notion / Excel / pegatinas). Cierra con la frase exacta de uniqueness.",
      structure: defaultStructureFor(format),
      platforms,
      centralClaim: claim,
    },
  ];

  return concepts;
}
