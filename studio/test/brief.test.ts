import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBrief } from "../src/lib/brief.js";
import type { BrandBrain } from "../src/types.js";

const baseBrain: BrandBrain = {
  workspaceId: "ws",
  slug: "qyro",
  workspaceType: "brand",
  brandColorPrimary: "#7C5CFC",
  taglineMain: "Tu día, optimizado",
  uniqueValueProp: "AI-powered daily planner",
  brandAdjectives: ["preciso", "calmado"],
  whatWeAreNot: ["agresivo"],
  competitors: [],
  claimsAllowed: ["organiza tu día"],
  claimsForbidden: ["cura la ansiedad"],
  disclaimersRequired: [],
  contentProfile: { free_first: true, primary_formats: ["ugc_video"] },
  personas: [
    {
      id: "p1",
      name: "Optimizador",
      pains: ["procrastinación"],
      workingHooks: ["He probado X..."],
      preferredPlatforms: ["tiktok", "instagram_reel"],
      preferredCta: "Descarga QYRO",
    },
  ],
  assets: [
    { id: "a1", section: "logo", name: "logo.png", fileUrl: "http://x/logo.png", metadata: {} },
  ],
  hooks: [{ id: "h1", text: "Mi rutina cambió" }],
};

test("buildBrief picks first persona when no id given", () => {
  const b = buildBrief(baseBrain, { format: "ugc_video" });
  assert.equal(b.persona.id, "p1");
  assert.equal(b.freeFirst, true);
});

test("buildBrief falls back to format defaults when persona has no platforms", () => {
  const brain = {
    ...baseBrain,
    personas: [{ ...baseBrain.personas[0], preferredPlatforms: [] }],
  };
  const b = buildBrief(brain, { format: "image" });
  assert.deepEqual(b.targetPlatforms, ["instagram_feed"]);
});

test("buildBrief propagates avoidFormats from profile", () => {
  const brain = {
    ...baseBrain,
    contentProfile: { ...baseBrain.contentProfile, avoid_formats: ["canva_design"] as any },
  };
  const b = buildBrief(brain, { format: "carousel" });
  assert.deepEqual(b.avoidFormats, ["canva_design"]);
});

test("buildBrief sets free_first=false by default for personal workspaces", () => {
  const brain = {
    ...baseBrain,
    workspaceType: "personal" as const,
    contentProfile: {},
  };
  const b = buildBrief(brain, { format: "ugc_video" });
  assert.equal(b.freeFirst, false);
});

test("buildBrief throws if no personas exist", () => {
  const brain = { ...baseBrain, personas: [] };
  assert.throws(() => buildBrief(brain, { format: "image" }));
});

test("buildBrief surfaces logo URL", () => {
  const b = buildBrief(baseBrain, { format: "ugc_video" });
  assert.equal(b.references.logoUrl, "http://x/logo.png");
});
