import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { stubAdapter } from "../src/adapters/stub.js";
import type { Brief } from "../src/types.js";

function brief(): Brief {
  return {
    workspace: "qyro",
    persona: { id: "p", name: "X", pains: [], workingHooks: [], preferredPlatforms: ["tiktok"] },
    format: "image",
    targetPlatforms: ["instagram_feed"],
    freeFirst: true,
    primaryFormats: [],
    avoidFormats: [],
    brand: {
      tagline: "",
      uvp: "",
      adjectives: [],
      whatWeAreNot: [],
      palette: "#3B82F6",
      claimsAllowed: [],
      claimsForbidden: [],
      disclaimers: [],
    },
    references: { screenshots: [], adReferences: [], ownAds: [], documents: [] },
    hooks: [],
  };
}

test("stub adapter writes a valid PNG with the expected signature", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "studio-stub-"));
  const out = await stubAdapter.generate({
    brief: brief(),
    choice: { tool: "mcp_image", model: "stub-png", estimatedCost: 0 },
    platform: "instagram_feed",
    format: "image",
    conceptHook: "test",
    outputDir: dir,
  });

  const stat = statSync(out.mediaPath);
  assert.ok(stat.size > 100, "file too small");
  const buf = readFileSync(out.mediaPath);
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  assert.deepEqual(
    Array.from(buf.slice(0, 8)),
    [137, 80, 78, 71, 13, 10, 26, 10],
  );
  rmSync(dir, { recursive: true });
});

test("stub adapter picks 4:5 for IG feed", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "studio-stub-"));
  const out = await stubAdapter.generate({
    brief: brief(),
    choice: { tool: "mcp_image", estimatedCost: 0 },
    platform: "instagram_feed",
    format: "image",
    conceptHook: "test",
    outputDir: dir,
  });
  assert.equal(out.ratio, "4:5");
  rmSync(dir, { recursive: true });
});

test("stub adapter picks 9:16 for TikTok", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "studio-stub-"));
  const out = await stubAdapter.generate({
    brief: brief(),
    choice: { tool: "mcp_image", estimatedCost: 0 },
    platform: "tiktok",
    format: "image",
    conceptHook: "test",
    outputDir: dir,
  });
  assert.equal(out.ratio, "9:16");
  rmSync(dir, { recursive: true });
});
