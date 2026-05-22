import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { isPremiumModel } from "../src/lib/spend.js";

test("premium model detection", () => {
  assert.equal(isPremiumModel("veo_3_1"), true);
  assert.equal(isPremiumModel("sora_2"), true);
  assert.equal(isPremiumModel("kling_3_premium"), true);
  assert.equal(isPremiumModel("seedance_2_0"), false);
  assert.equal(isPremiumModel(undefined), false);
});

test("spend summation only counts current month entries", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "studio-spend-"));
  const now = new Date();
  const file = path.join(dir, "creative-runs.jsonl");
  const lastMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() - 1, 5).toISOString();
  const thisMonth = new Date(now.getUTCFullYear(), now.getUTCMonth(), 5).toISOString();
  writeFileSync(
    file,
    [
      JSON.stringify({ timestamp: lastMonth, credits: 100 }),
      JSON.stringify({ timestamp: thisMonth, credits: 18 }),
      JSON.stringify({ timestamp: thisMonth, credits: 7 }),
      "broken line",
    ].join("\n") + "\n",
  );

  process.env.STUDIO_LOGS_DIR = dir;
  process.env.HIGGSFIELD_MONTHLY_CREDIT_BUDGET = "500";
  process.env.HIGGSFIELD_WARN_AT_PCT = "70";
  process.env.HIGGSFIELD_BLOCK_PREMIUM_AT_PCT = "90";
  // reset cached config
  const { resetConfigForTests } = await import("../src/lib/config.js");
  resetConfigForTests();
  const { readSpend } = await import("../src/lib/spend.js");
  const s = await readSpend();
  assert.equal(s.creditsSpentThisMonth, 25);
  assert.equal(s.remaining, 475);

  rmSync(dir, { recursive: true });
});
