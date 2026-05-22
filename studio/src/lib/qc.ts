// QC engine — runs deterministic checks against a rendered variant before
// pushing to Pulse. Catches forbidden claims, wrong ratio, oversized captions,
// missing logo overlay, and (for video) missing hook and burned subtitles.

import type { BrandBrain, PlatformVariant, QCResult } from "../types.js";
import {
  CAPTION_LIMIT,
  DURATION_RANGE,
  HASHTAG_LIMIT,
  RATIO_BY_PLATFORM,
} from "./constants.js";

function isVideo(variant: PlatformVariant): boolean {
  // crude: presence of duration ⇒ video. The renderer always fills duration
  // for video so this is reliable in practice.
  return typeof variant.durationSec === "number" && variant.durationSec > 0;
}

function containsForbiddenClaim(text: string, forbidden: string[]): boolean {
  const lower = text.toLowerCase();
  return forbidden.some((c) => c && lower.includes(c.toLowerCase()));
}

export function qcCheck(variant: PlatformVariant, brain: BrandBrain): QCResult {
  const forbidden = brain.claimsForbidden ?? [];
  const captionLimit = CAPTION_LIMIT[variant.platform];
  const hashtagLimit = HASHTAG_LIMIT[variant.platform];
  const expectedRatio = RATIO_BY_PLATFORM[variant.platform];
  const range = DURATION_RANGE[variant.platform];

  const failed: string[] = [];

  if (variant.ratio !== expectedRatio) failed.push("ratio_correct");

  if (isVideo(variant)) {
    if (range.min !== undefined && (variant.durationSec ?? 0) < range.min) {
      failed.push("duration_in_range");
    } else if (range.max !== undefined && (variant.durationSec ?? 0) > range.max) {
      failed.push("duration_in_range");
    }
    if (!variant.hasEarlyHook) failed.push("hook_in_3s");
    if (!variant.hasBurnedSubtitles) failed.push("subtitles_present");
  }

  if (variant.caption.length > captionLimit) failed.push("caption_length");
  if (variant.hashtags.length > hashtagLimit) failed.push("hashtag_count");

  const combined = [variant.caption, ...(variant.hashtags ?? []), variant.firstComment ?? ""].join(
    " ",
  );
  if (containsForbiddenClaim(combined, forbidden)) failed.push("no_forbidden_claims");

  if (!variant.hasLogoOverlay) failed.push("logo_present");

  return { passed: failed.length === 0, failed };
}

export function explainFailure(rule: string): string {
  const map: Record<string, string> = {
    ratio_correct: "Output ratio doesn't match the platform spec",
    duration_in_range: "Video duration outside the accepted window for this platform",
    caption_length: "Caption exceeds the platform character limit",
    hashtag_count: "Too many hashtags for this platform",
    no_forbidden_claims: "Text contains a claim listed in claims_forbidden",
    logo_present: "Logo overlay was not applied",
    hook_in_3s: "Video lacks an early hook in the first 3 seconds",
    subtitles_present: "Video has no burned-in subtitles",
  };
  return map[rule] ?? rule;
}
