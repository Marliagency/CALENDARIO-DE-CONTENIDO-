// Brand Brain fetcher with in-memory cache (30min TTL).
//
// The studio reads the brain before every generation but should not hammer the
// Pulse API on every user message — TTL keeps it light while letting the user
// run "actualiza el contexto" to invalidate.

import { pulseFetch } from "./pulse-api.js";
import type { BrandBrain, BrandAsset, BuyerPersona } from "../types.js";

interface CacheEntry {
  data: BrandBrain;
  fetchedAt: number;
}

const TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function defaultProfileForType(type?: string) {
  if (type === "personal") {
    return { free_first: false, primary_formats: [], avoid_formats: [] };
  }
  return { free_first: true, primary_formats: [], avoid_formats: [] };
}

export async function getBrandBrain(slug: string, apiKey?: string): Promise<BrandBrain> {
  const cached = cache.get(slug);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return cached.data;
  }

  const [brainRaw, personasRaw, assetsRaw, hooksRaw, workspace] = await Promise.all([
    pulseFetch<Record<string, unknown> | null>(`/api/v1/w/${slug}/brain`, { apiKey }),
    pulseFetch<Record<string, unknown>[]>(`/api/v1/w/${slug}/brain/personas`, { apiKey }),
    pulseFetch<Record<string, unknown>[]>(`/api/v1/w/${slug}/brain/assets`, { apiKey }),
    pulseFetch<Record<string, unknown>[]>(`/api/v1/w/${slug}/brain/hooks`, { apiKey }),
    pulseFetch<Record<string, unknown> | null>(`/api/v1/workspaces/${slug}`, { apiKey }).catch(() => null),
  ]);

  if (!brainRaw) {
    throw new Error(`Brand Brain for workspace "${slug}" is empty. Fill it in Pulse first.`);
  }

  const profile =
    (brainRaw.contentProfile as Record<string, unknown>) ??
    defaultProfileForType(workspace?.type as string | undefined);

  const personas: BuyerPersona[] = personasRaw.map((p) => ({
    id: p.id as string,
    name: p.name as string,
    pains: (p.pains as string[]) ?? [],
    jtbdFunctional: (p.jtbdFunctional as string) ?? null,
    workingHooks: (p.workingHooks as string[]) ?? [],
    preferredPlatforms: ((p.preferredPlatforms as string[]) ?? []) as BuyerPersona["preferredPlatforms"],
    preferredCta: (p.preferredCta as string) ?? null,
  }));

  const assets: BrandAsset[] = assetsRaw.map((a) => ({
    id: a.id as string,
    section: a.section as string,
    name: a.name as string,
    fileUrl: a.fileUrl as string,
    metadata: (a.metadata as Record<string, unknown>) ?? {},
  }));

  const brain: BrandBrain = {
    workspaceId: brainRaw.workspaceId as string,
    slug,
    workspaceType: workspace?.type as BrandBrain["workspaceType"],
    brandColorPrimary: workspace?.brandColorPrimary as string | undefined,
    brandColorSecondary: (workspace?.brandColorSecondary as string) ?? null,
    taglineMain: (brainRaw.taglineMain as string) ?? "",
    uniqueValueProp: (brainRaw.uniqueValueProp as string) ?? "",
    brandAdjectives: (brainRaw.brandAdjectives as string[]) ?? [],
    whatWeAreNot: (brainRaw.whatWeAreNot as string[]) ?? [],
    competitors: (brainRaw.competitors as { name: string; differentiator: string }[]) ?? [],
    claimsAllowed: (brainRaw.claimsAllowed as string[]) ?? [],
    claimsForbidden: (brainRaw.claimsForbidden as string[]) ?? [],
    disclaimersRequired: (brainRaw.disclaimersRequired as string[]) ?? [],
    contentProfile: profile as BrandBrain["contentProfile"],
    personas,
    assets,
    hooks: hooksRaw.map((h) => ({
      id: h.id as string,
      text: h.text as string,
      personaId: (h.personaId as string) ?? null,
    })),
  };

  cache.set(slug, { data: brain, fetchedAt: Date.now() });
  return brain;
}

export function invalidateBrandBrain(slug: string) {
  cache.delete(slug);
}

export function summarizeBrain(brain: BrandBrain): string {
  const sections = brain.assets.reduce<Record<string, number>>((acc, a) => {
    acc[a.section] = (acc[a.section] ?? 0) + 1;
    return acc;
  }, {});
  const missing: string[] = [];
  if (!brain.taglineMain) missing.push("tagline_main");
  if (!brain.uniqueValueProp) missing.push("unique_value_prop");
  if (brain.personas.length === 0) missing.push("personas");
  if (brain.hooks.length === 0) missing.push("hooks library");
  if (brain.claimsAllowed.length === 0) missing.push("claims_allowed");
  if (!(sections.logo > 0)) missing.push("at least one logo asset");

  return [
    `Workspace: ${brain.slug}`,
    `Tagline: ${brain.taglineMain || "(empty)"}`,
    `Personas: ${brain.personas.length}`,
    `Hooks: ${brain.hooks.length}`,
    `Claims allowed: ${brain.claimsAllowed.length} / forbidden: ${brain.claimsForbidden.length}`,
    `Assets: ${Object.entries(sections)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ") || "none"}`,
    missing.length ? `Missing: ${missing.join(", ")}` : "Brain looks complete",
  ].join("\n");
}
