import { test } from "node:test";
import assert from "node:assert/strict";
import { proposeConcepts } from "../src/lib/concepts.js";
import type { Brief } from "../src/types.js";

function brief(overrides: Partial<Brief> = {}): Brief {
  return {
    workspace: "qyro",
    persona: {
      id: "p1",
      name: "Optimizador",
      pains: ["procrastinación", "falta de foco"],
      workingHooks: ["He probado N apps de productividad…"],
      preferredPlatforms: ["tiktok", "instagram_reel"],
      preferredCta: "Descarga QYRO",
    },
    format: "ugc_video",
    targetPlatforms: ["tiktok", "instagram_reel"],
    freeFirst: true,
    primaryFormats: [],
    avoidFormats: [],
    brand: {
      tagline: "Tu día, optimizado",
      uvp: "AI-powered daily planner",
      adjectives: ["preciso", "calmado"],
      whatWeAreNot: ["agresivo"],
      palette: "#7C5CFC",
      claimsAllowed: ["organiza tu día"],
      claimsForbidden: ["cura"],
      disclaimers: [],
    },
    references: { screenshots: [], adReferences: [], ownAds: [], documents: [] },
    hooks: [{ id: "h1", text: "Mi rutina cambió" }],
    ...overrides,
  };
}

test("proposeConcepts returns exactly 3 distinct concepts", () => {
  const c = proposeConcepts(brief());
  assert.equal(c.length, 3);
  const titles = new Set(c.map((x) => x.title));
  assert.equal(titles.size, 3);
});

test("concepts include the central claim from claims_allowed when present", () => {
  const c = proposeConcepts(brief());
  for (const concept of c) {
    assert.equal(concept.centralClaim, "organiza tu día");
  }
});

test("concepts inherit target platforms from the brief", () => {
  const c = proposeConcepts(brief());
  for (const concept of c) {
    assert.deepEqual(concept.platforms, ["tiktok", "instagram_reel"]);
  }
});

test("concepts pick hooks from library + persona", () => {
  const c = proposeConcepts(brief());
  // first concept uses first library hook
  assert.equal(c[0].hook, "Mi rutina cambió");
});

test("concepts fall back to synthesized hook when both libraries are empty", () => {
  const c = proposeConcepts(
    brief({
      hooks: [],
      persona: {
        ...brief().persona,
        workingHooks: [],
        pains: ["no termino lo que empiezo"],
      },
    }),
  );
  for (const concept of c) {
    assert.match(concept.hook, /no termino lo que empiezo/);
  }
});
