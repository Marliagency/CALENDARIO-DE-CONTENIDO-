// Per-platform caption + hashtag + first-comment builder.
//
// Templated, not LLM-driven: takes the chosen concept + persona + brand and
// emits text that satisfies the QC rules. The Claude Code chat is free to
// override any field on the resulting variant, but the defaults are good
// enough to pass QC unattended (correct length, no forbidden claims when the
// concept already complies, correct hashtag count).

import type { BrandBrain, Concept, Platform } from "../types.js";
import { CAPTION_LIMIT, HASHTAG_LIMIT } from "./constants.js";

interface CaptionContext {
  brain: BrandBrain;
  concept: Concept;
  personaName: string;
  cta?: string | null;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

function sanitize(text: string, forbidden: string[]): string {
  // Cheap guard: if any forbidden token appears verbatim, replace it with
  // ellipsis. The QC engine still runs after this so anything that slips
  // through gets blocked there.
  let out = text;
  for (const claim of forbidden) {
    if (!claim) continue;
    const re = new RegExp(claim.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig");
    out = out.replace(re, "…");
  }
  return out;
}

function baseHashtags(brain: BrandBrain): string[] {
  const adjectives = (brain.brandAdjectives ?? []).slice(0, 2);
  const slug = brain.slug.replace(/-/g, "");
  return [`#${slug}`, ...adjectives.map((a) => `#${a.replace(/[^a-z0-9]/gi, "")}`)].filter(
    (t) => t.length > 1,
  );
}

function platformDisclaimer(_p: Platform, required: string[]): string {
  return required.length > 0 ? `\n\n${required.join(" ")}` : "";
}

export function buildCaption(
  platform: Platform,
  ctx: CaptionContext,
): { caption: string; hashtags: string[]; firstComment?: string } {
  const { brain, concept } = ctx;
  const cta = ctx.cta ?? brain.personas[0]?.preferredCta ?? "Link en bio";
  const limit = CAPTION_LIMIT[platform];
  const hashLimit = HASHTAG_LIMIT[platform];

  let body: string;
  switch (platform) {
    case "tiktok":
    case "facebook_reel":
      body = `${concept.hook}\n\n${concept.centralClaim}\n\n${cta}`;
      break;
    case "instagram_reel":
      body = `${concept.hook}\n\n${concept.angle}\n\n${cta}`;
      break;
    case "instagram_feed":
      body = `${concept.hook}\n\n${concept.angle}\n\n${concept.centralClaim}\n\n${cta}`;
      break;
    case "instagram_story":
      body = `${concept.hook}\n${cta}`;
      break;
    case "facebook_feed":
      body = `${concept.hook}\n\n${concept.angle}\n\n${concept.centralClaim}\n\n${cta}`;
      break;
    case "youtube_short":
      body = `${concept.hook} · ${concept.centralClaim}`;
      break;
    case "linkedin":
      body = `${concept.hook}\n\n${concept.angle}\n\n${concept.centralClaim}\n\n${cta}`;
      break;
    case "pinterest":
      body = `${concept.hook} — ${concept.centralClaim}`;
      break;
    case "twitter_x":
      body = `${concept.hook} ${cta}`;
      break;
    default:
      body = concept.hook;
  }

  body = sanitize(body, brain.claimsForbidden);
  const disclaimer = platformDisclaimer(platform, brain.disclaimersRequired);
  const caption = truncate(body + disclaimer, limit);

  const hashtags = baseHashtags(brain).slice(0, hashLimit);

  const firstComment =
    platform === "instagram_reel" || platform === "instagram_feed"
      ? `${cta} 👇`
      : platform === "tiktok"
      ? cta
      : undefined;

  return { caption, hashtags, firstComment };
}
