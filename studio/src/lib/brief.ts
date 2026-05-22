// Turns a BrandBrain + user request into a Brief — the input contract for the
// generation pipeline. Centralises defaulting logic so the orchestrator and
// tests share the same code path.

import type { BrandBrain, Brief, Format, Platform } from "../types.js";

export interface UserRequest {
  format: Format;
  personaId?: string;
  platforms?: Platform[];
  campaignId?: string;
  isBatch?: boolean;
  usePletorWorkflow?: boolean;
}

function defaultPlatformsForFormat(format: Format): Platform[] {
  if (format === "image" || format === "carousel" || format === "canva_design") {
    return ["instagram_feed"];
  }
  if (format === "voiceover") return [];
  return ["tiktok", "instagram_reel"];
}

export function buildBrief(brain: BrandBrain, request: UserRequest): Brief {
  if (brain.personas.length === 0) {
    throw new Error(
      `Workspace "${brain.slug}" has no personas. Add at least one in Pulse before generating.`,
    );
  }
  const persona =
    brain.personas.find((p) => p.id === request.personaId) ?? brain.personas[0];

  const profile = brain.contentProfile ?? {};
  const platforms =
    request.platforms ??
    (persona.preferredPlatforms.length > 0
      ? persona.preferredPlatforms
      : defaultPlatformsForFormat(request.format));

  const logo = brain.assets.find((a) => a.section === "logo");

  return {
    workspace: brain.slug,
    persona,
    format: request.format,
    targetPlatforms: platforms,
    freeFirst: profile.free_first ?? (brain.workspaceType !== "personal"),
    primaryFormats: profile.primary_formats ?? [],
    avoidFormats: profile.avoid_formats ?? [],
    isBatch: request.isBatch,
    usePletorWorkflow: request.usePletorWorkflow,
    brand: {
      tagline: brain.taglineMain,
      uvp: brain.uniqueValueProp,
      adjectives: brain.brandAdjectives,
      whatWeAreNot: brain.whatWeAreNot,
      palette: brain.brandColorPrimary ?? "#3B82F6",
      claimsAllowed: brain.claimsAllowed,
      claimsForbidden: brain.claimsForbidden,
      disclaimers: brain.disclaimersRequired,
    },
    references: {
      logoUrl: logo?.fileUrl,
      screenshots: brain.assets.filter((a) => a.section === "screenshot"),
      adReferences: brain.assets.filter((a) => a.section === "ad_reference"),
      ownAds: brain.assets.filter((a) => a.section === "ad_own"),
      documents: brain.assets.filter((a) => a.section === "document"),
    },
    hooks: brain.hooks.map((h) => ({ id: h.id, text: h.text })),
    campaignId: request.campaignId,
  };
}
