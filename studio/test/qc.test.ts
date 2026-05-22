import { test } from "node:test";
import assert from "node:assert/strict";
import { qcCheck } from "../src/lib/qc.js";
import type { BrandBrain, PlatformVariant } from "../src/types.js";

const brain: BrandBrain = {
  workspaceId: "ws",
  slug: "qyro",
  taglineMain: "",
  uniqueValueProp: "",
  brandAdjectives: [],
  whatWeAreNot: [],
  competitors: [],
  claimsAllowed: [],
  claimsForbidden: ["cura", "garantizado"],
  disclaimersRequired: [],
  contentProfile: {},
  personas: [],
  assets: [],
  hooks: [],
};

function videoVariant(overrides: Partial<PlatformVariant> = {}): PlatformVariant {
  return {
    platform: "tiktok",
    mediaUrl: "/tmp/a.mp4",
    ratio: "9:16",
    durationSec: 15,
    caption: "ok",
    hashtags: ["a", "b", "c"],
    hasLogoOverlay: true,
    hasEarlyHook: true,
    hasBurnedSubtitles: true,
    ...overrides,
  };
}

test("happy path passes QC", () => {
  const r = qcCheck(videoVariant(), brain);
  assert.equal(r.passed, true);
});

test("wrong ratio fails", () => {
  const r = qcCheck(videoVariant({ ratio: "1:1" }), brain);
  assert.ok(r.failed.includes("ratio_correct"));
});

test("forbidden claim in caption fails", () => {
  const r = qcCheck(
    videoVariant({ caption: "Esto es la cura definitiva" }),
    brain,
  );
  assert.ok(r.failed.includes("no_forbidden_claims"));
});

test("forbidden claim in hashtag fails", () => {
  const r = qcCheck(
    videoVariant({ caption: "ok", hashtags: ["garantizado"] }),
    brain,
  );
  assert.ok(r.failed.includes("no_forbidden_claims"));
});

test("missing logo fails", () => {
  const r = qcCheck(videoVariant({ hasLogoOverlay: false }), brain);
  assert.ok(r.failed.includes("logo_present"));
});

test("video without early hook fails", () => {
  const r = qcCheck(videoVariant({ hasEarlyHook: false }), brain);
  assert.ok(r.failed.includes("hook_in_3s"));
});

test("video without subtitles fails", () => {
  const r = qcCheck(videoVariant({ hasBurnedSubtitles: false }), brain);
  assert.ok(r.failed.includes("subtitles_present"));
});

test("oversized caption fails", () => {
  const r = qcCheck(videoVariant({ caption: "x".repeat(3000) }), brain);
  assert.ok(r.failed.includes("caption_length"));
});

test("too many hashtags fails", () => {
  const r = qcCheck(
    videoVariant({ hashtags: ["a", "b", "c", "d", "e", "f"] }),
    brain,
  );
  assert.ok(r.failed.includes("hashtag_count"));
});

test("image variant skips video-only checks", () => {
  const r = qcCheck(
    {
      platform: "instagram_feed",
      mediaUrl: "/tmp/a.png",
      ratio: "4:5",
      caption: "ok",
      hashtags: [],
      hasLogoOverlay: true,
      hasEarlyHook: false, // n/a for image
      hasBurnedSubtitles: false, // n/a for image
    },
    brain,
  );
  assert.equal(r.passed, true);
});

test("duration outside range fails", () => {
  const r = qcCheck(videoVariant({ durationSec: 300 }), brain);
  assert.ok(r.failed.includes("duration_in_range"));
});
