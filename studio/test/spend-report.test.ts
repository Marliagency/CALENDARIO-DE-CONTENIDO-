import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { aggregate, formatTable, type RunRow } from "../src/lib/spend-report.js";

const now = new Date();
const today = new Date(now.getTime() - 2 * 24 * 60 * 60_000).toISOString();
const lastWeek = new Date(now.getTime() - 6 * 24 * 60 * 60_000).toISOString();

const rows: RunRow[] = [
  { timestamp: today, tool: "higgsfield_skills", model: "seedance_2_0", credits: 18, format: "ugc_video", content_piece_id: "cp1", workspace: "qyro" },
  { timestamp: today, tool: "higgsfield_skills", model: "seedance_2_0", credits: 18, format: "ugc_video", content_piece_id: "cp2", workspace: "qyro" },
  { timestamp: lastWeek, tool: "remotion", model: "remotion_local", credits: 0, format: "motion_graphic", content_piece_id: "cp3", workspace: "qyro" },
  { timestamp: today, tool: "mcp_image", model: "gemini-nano-banana-2", credits: 0, format: "image", content_piece_id: "cp4", workspace: "personal" },
];

test("aggregate groups by tool with correct sums", () => {
  const out = aggregate(rows, "tool");
  const hf = out.find((b) => b.key === "higgsfield_skills");
  assert.ok(hf);
  assert.equal(hf.credits, 36);
  assert.equal(hf.runs, 2);
  assert.equal(hf.pieces, 2);
});

test("aggregate counts unique pieces only", () => {
  const dupes: RunRow[] = [
    { timestamp: today, tool: "remotion", credits: 0, content_piece_id: "cp_same", workspace: "x" },
    { timestamp: today, tool: "remotion", credits: 0, content_piece_id: "cp_same", workspace: "x" },
    { timestamp: today, tool: "remotion", credits: 0, content_piece_id: "cp_other", workspace: "x" },
  ];
  const out = aggregate(dupes, "tool");
  assert.equal(out[0].runs, 3);
  assert.equal(out[0].pieces, 2);
});

test("aggregate by workspace separates workspaces", () => {
  const out = aggregate(rows, "workspace");
  assert.equal(out.length, 2);
  const keys = new Set(out.map((b) => b.key));
  assert.ok(keys.has("qyro"));
  assert.ok(keys.has("personal"));
});

test("aggregate sorts by credits desc", () => {
  const out = aggregate(rows, "model");
  assert.equal(out[0].key, "seedance_2_0");
});

test("formatTable produces a readable string", () => {
  const out = aggregate(rows, "tool");
  const s = formatTable(out, "tool");
  assert.ok(s.includes("higgsfield_skills"));
  assert.ok(s.includes("credits"));
});

test("readRuns filters by recency", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "spend-report-"));
  const veryOld = new Date(now.getTime() - 90 * 24 * 60 * 60_000).toISOString();
  writeFileSync(
    path.join(dir, "creative-runs.jsonl"),
    [
      JSON.stringify({ timestamp: today, tool: "a", credits: 5 }),
      JSON.stringify({ timestamp: veryOld, tool: "b", credits: 100 }),
    ].join("\n") + "\n",
  );
  process.env.STUDIO_LOGS_DIR = dir;
  const { resetConfigForTests } = await import("../src/lib/config.js");
  resetConfigForTests();
  const { readRuns } = await import("../src/lib/spend-report.js");
  const out = await readRuns(30);
  assert.equal(out.length, 1);
  assert.equal(out[0].tool, "a");
  rmSync(dir, { recursive: true });
});
