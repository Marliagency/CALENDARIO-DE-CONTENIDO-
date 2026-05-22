import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseModel } from "../src/lib/router.js";
import type { Brief, Format } from "../src/types.js";

function makeBrief(overrides: Partial<Brief> = {}): Brief {
  return {
    workspace: "qyro",
    persona: {
      id: "p1",
      name: "Optimizador",
      pains: [],
      workingHooks: [],
      preferredPlatforms: ["tiktok"],
    },
    format: "ugc_video",
    targetPlatforms: ["tiktok"],
    freeFirst: true,
    primaryFormats: [],
    avoidFormats: [],
    brand: {
      tagline: "",
      uvp: "",
      adjectives: [],
      whatWeAreNot: [],
      palette: "#000",
      claimsAllowed: [],
      claimsForbidden: [],
      disclaimers: [],
    },
    references: { screenshots: [], adReferences: [], ownAds: [], documents: [] },
    hooks: [],
    ...overrides,
  };
}

test("app_demo always uses Remotion (free)", () => {
  const c = chooseModel("app_demo", makeBrief());
  assert.equal(c.tool, "remotion");
  assert.equal(c.estimatedCost, 0);
});

test("motion_graphic always uses Remotion", () => {
  const c = chooseModel("motion_graphic", makeBrief({ freeFirst: false }));
  assert.equal(c.tool, "remotion");
});

test("image with free_first uses mcp-image", () => {
  const c = chooseModel("image", makeBrief({ freeFirst: true }));
  assert.equal(c.tool, "mcp_image");
});

test("image without free_first uses Higgsfield", () => {
  const c = chooseModel("image", makeBrief({ freeFirst: false }));
  assert.equal(c.tool, "higgsfield_skills");
  assert.equal(c.estimatedCredits, 3);
});

test("ugc_video free_first proposes Remotion with Higgsfield fallback", () => {
  const c = chooseModel("ugc_video", makeBrief({ freeFirst: true }));
  assert.equal(c.tool, "remotion");
  assert.equal(c.alternativeIfRejected?.tool, "higgsfield_skills");
});

test("lifestyle_ad always requires confirmation", () => {
  const c = chooseModel("lifestyle_ad", makeBrief({ freeFirst: false }));
  assert.equal(c.requiresConfirmation, true);
});

test("canva_design respects avoid list", () => {
  const c = chooseModel(
    "canva_design",
    makeBrief({ avoidFormats: ["canva_design"] }),
  );
  // falls through to fallback (mcp_image)
  assert.notEqual(c.tool, "canva_mcp");
});

test("each format produces a valid tool choice", () => {
  const formats: Format[] = [
    "ugc_video",
    "lifestyle_ad",
    "app_demo",
    "ui_demo",
    "motion_graphic",
    "data_animation",
    "text_video",
    "logo_animation",
    "svg_motion",
    "canva_design",
    "carousel",
    "image",
    "voiceover",
  ];
  for (const f of formats) {
    const c = chooseModel(f, makeBrief());
    assert.ok(c.tool, `format ${f} produced no tool`);
  }
});
