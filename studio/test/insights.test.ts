// End-to-end test for `computeInsights` against a mocked Pulse server.
// Validates: cross-referencing creative-runs.jsonl with /performance and
// the ordering by reach-per-credit efficiency.

import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

function startMockPulse(perf: Record<string, unknown>): Promise<{
  port: number;
  close: () => Promise<void>;
}> {
  return new Promise((resolve) => {
    const server = http.createServer({ keepAlive: false }, async (req, res) => {
      res.setHeader("connection", "close");
      const m = /\/api\/v1\/w\/[^/]+\/content\/pieces\/([^/]+)\/performance/.exec(req.url ?? "");
      if (m) {
        const id = m[1];
        const body = perf[id];
        if (!body) {
          res.statusCode = 404;
          res.end("not found");
          return;
        }
        res.statusCode = 200;
        res.end(JSON.stringify(body));
        return;
      }
      res.statusCode = 404;
      res.end();
    });
    server.listen(0, "127.0.0.1", () => {
      resolve({
        port: (server.address() as { port: number }).port,
        close: () =>
          new Promise<void>((r) => {
            (server as unknown as { closeAllConnections?: () => void }).closeAllConnections?.();
            server.close(() => r());
          }),
      });
    });
  });
}

test("computeInsights cross-references runs with Pulse performance", async (t) => {
  const today = new Date().toISOString();
  const runsDir = mkdtempSync(path.join(tmpdir(), "studio-insights-"));
  writeFileSync(
    path.join(runsDir, "creative-runs.jsonl"),
    [
      JSON.stringify({ timestamp: today, workspace: "qyro", tool: "remotion", credits: 0, content_piece_id: "cp1", format: "motion_graphic", persona: "Opt" }),
      JSON.stringify({ timestamp: today, workspace: "qyro", tool: "higgsfield_skills", model: "seedance_2_0", credits: 18, content_piece_id: "cp2", format: "ugc_video", persona: "Opt" }),
    ].join("\n") + "\n",
  );

  const server = await startMockPulse({
    cp1: {
      piece_id: "cp1",
      title: "Free motion",
      format: "motion_graphic",
      hook_used: null,
      buyer_persona_id: null,
      variants: [
        { id: "v1", platform: "tiktok", reach: 5000, impressions: 8000, likes: 200, comments: 30, shares: 10, engagement_rate: 0.03, hook_rate: null, hold_rate: null, fetched_at: today },
      ],
    },
    cp2: {
      piece_id: "cp2",
      title: "Paid UGC",
      format: "ugc_video",
      hook_used: null,
      buyer_persona_id: null,
      variants: [
        { id: "v2", platform: "tiktok", reach: 18000, impressions: 25000, likes: 500, comments: 80, shares: 30, engagement_rate: 0.024, hook_rate: null, hold_rate: null, fetched_at: today },
      ],
    },
  });

  t.after(async () => {
    await server.close();
    rmSync(runsDir, { recursive: true });
  });

  process.env.PULSE_API_BASE_URL = `http://127.0.0.1:${server.port}`;
  process.env.QYRO_PULSE_API_KEY = "k";
  process.env.PULSE_WORKSPACE_SLUG = "qyro";
  process.env.STUDIO_LOGS_DIR = runsDir;
  const { resetConfigForTests } = await import("../src/lib/config.js");
  resetConfigForTests();

  const { computeInsights } = await import("../src/lib/insights.js");
  const rows = await computeInsights({
    workspaceSlug: "qyro",
    daysBack: 7,
    dim: "tool",
    apiKey: "k",
  });
  assert.equal(rows.length, 2);
  // remotion has reach 5000 / 0 credits → infinity efficiency, comes first
  assert.equal(rows[0].key, "remotion");
  // higgsfield: reach 18000 / 18 credits = 1000 per credit
  const hf = rows.find((r) => r.key === "higgsfield_skills");
  assert.ok(hf);
  assert.equal(hf.efficiency, 1000);
  assert.equal(hf.credits, 18);
});

test("computeInsights returns empty array when no runs exist", async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "studio-insights-empty-"));
  t.after(() => rmSync(dir, { recursive: true }));
  process.env.STUDIO_LOGS_DIR = dir;
  const { resetConfigForTests } = await import("../src/lib/config.js");
  resetConfigForTests();
  const { computeInsights } = await import("../src/lib/insights.js");
  const rows = await computeInsights({ workspaceSlug: "qyro", apiKey: "k" });
  assert.deepEqual(rows, []);
});
