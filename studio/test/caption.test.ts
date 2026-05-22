import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCaption } from "../src/lib/caption.js";
import type { BrandBrain, Concept } from "../src/types.js";

const brain: BrandBrain = {
  workspaceId: "ws",
  slug: "qyro",
  taglineMain: "Tu día, optimizado",
  uniqueValueProp: "AI-powered planner",
  brandAdjectives: ["preciso", "calmado"],
  whatWeAreNot: [],
  competitors: [],
  claimsAllowed: ["organiza tu día"],
  claimsForbidden: ["cura", "garantizado"],
  disclaimersRequired: [],
  contentProfile: {},
  personas: [],
  assets: [],
  hooks: [],
};

const concept: Concept = {
  index: 1,
  title: "Pain-first",
  hook: "Mi rutina cambió cuando…",
  angle: "Arranca con el dolor, resuelve con la promesa.",
  structure: "UGC 15s",
  platforms: ["tiktok"],
  centralClaim: "organiza tu día",
};

test("tiktok caption stays under the limit", () => {
  const out = buildCaption("tiktok", { brain, concept, personaName: "X" });
  assert.ok(out.caption.length <= 2200);
  assert.ok(out.caption.includes("Mi rutina cambió"));
});

test("hashtag count respects platform limit", () => {
  const out = buildCaption("tiktok", { brain, concept, personaName: "X" });
  assert.ok(out.hashtags.length <= 5);
});

test("forbidden claim in central claim gets sanitized", () => {
  const dirtyConcept = { ...concept, centralClaim: "esto te cura la ansiedad" };
  const out = buildCaption("instagram_feed", {
    brain,
    concept: dirtyConcept,
    personaName: "X",
  });
  assert.ok(!/cura/i.test(out.caption));
});

test("instagram_story caption stays under 250", () => {
  const out = buildCaption("instagram_story", { brain, concept, personaName: "X" });
  assert.ok(out.caption.length <= 250);
});

test("twitter caption stays under 280", () => {
  const out = buildCaption("twitter_x", { brain, concept, personaName: "X" });
  assert.ok(out.caption.length <= 280);
});

test("first comment appears on IG/TikTok only", () => {
  assert.ok(buildCaption("instagram_reel", { brain, concept, personaName: "X" }).firstComment);
  assert.ok(buildCaption("tiktok", { brain, concept, personaName: "X" }).firstComment);
  assert.equal(buildCaption("linkedin", { brain, concept, personaName: "X" }).firstComment, undefined);
});

test("base hashtags include workspace slug", () => {
  const out = buildCaption("tiktok", { brain, concept, personaName: "X" });
  assert.ok(out.hashtags.some((h) => h === "#qyro"));
});

test("disclaimers are appended when required", () => {
  const withDisc = { ...brain, disclaimersRequired: ["#ad"] };
  const out = buildCaption("instagram_feed", { brain: withDisc, concept, personaName: "X" });
  assert.ok(out.caption.includes("#ad"));
});
