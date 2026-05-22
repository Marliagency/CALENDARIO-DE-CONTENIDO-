// End-to-end pipeline test against an in-process mock Pulse server.
// Verifies: stub generation → QC → upload → push, with idempotency.

import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { BrandBrain } from "../src/types.js";

interface ReceivedPush {
  external_ref: string;
  platform_variants: Record<string, { media_url: string }>;
}

interface MockServer {
  port: number;
  receivedUploads: number;
  receivedPushes: ReceivedPush[];
  close: () => Promise<void>;
}

function startMockPulse(): Promise<MockServer> {
  return new Promise((resolve) => {
    const state: MockServer = {
      port: 0,
      receivedUploads: 0,
      receivedPushes: [],
      close: () => Promise.resolve(),
    };
    const seenRefs = new Map<string, string>();
    const server = http.createServer({ keepAlive: false }, async (req, res) => {
      res.setHeader("connection", "close");
      const url = req.url ?? "";
      if (url === "/api/v1/ingest/creative-uploads" && req.method === "POST") {
        // drain body and respond
        for await (const _ of req) {
          /* discard */
        }
        state.receivedUploads++;
        res.statusCode = 201;
        res.setHeader("content-type", "application/json");
        const key = `mockws/${state.receivedUploads}.png`;
        res.end(
          JSON.stringify({
            url: `http://mock.local/storage/${key}`,
            key,
            size_bytes: 123,
            content_type: "image/png",
          }),
        );
        return;
      }
      if (url === "/api/v1/ingest/content-pieces" && req.method === "POST") {
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as ReceivedPush;
        if (seenRefs.has(body.external_ref)) {
          res.statusCode = 200;
          res.end(
            JSON.stringify({ content_piece_id: seenRefs.get(body.external_ref), idempotent: true }),
          );
          return;
        }
        state.receivedPushes.push(body);
        const id = `cp_${state.receivedPushes.length}`;
        seenRefs.set(body.external_ref, id);
        res.statusCode = 201;
        res.end(JSON.stringify({ content_piece_id: id }));
        return;
      }
      res.statusCode = 404;
      res.end("not found");
    });
    server.listen(0, "127.0.0.1", () => {
      state.port = (server.address() as { port: number }).port;
      state.close = () =>
        new Promise<void>((r) => {
          (server as unknown as { closeAllConnections?: () => void }).closeAllConnections?.();
          server.close(() => r());
        });
      resolve(state);
    });
  });
}

function brain(): BrandBrain {
  return {
    workspaceId: "ws",
    slug: "qyro",
    workspaceType: "brand",
    brandColorPrimary: "#7C5CFC",
    taglineMain: "Tu día, optimizado",
    uniqueValueProp: "AI-powered planner",
    brandAdjectives: ["preciso"],
    whatWeAreNot: [],
    competitors: [],
    claimsAllowed: ["organiza tu día"],
    claimsForbidden: [],
    disclaimersRequired: [],
    contentProfile: { free_first: true },
    personas: [
      {
        id: "p1",
        name: "Optimizador",
        pains: ["procrastinación"],
        workingHooks: ["Mi rutina cambió"],
        preferredPlatforms: ["instagram_feed"],
        preferredCta: "Descarga QYRO",
      },
    ],
    assets: [], // no logo → skipBranding will be used
    hooks: [{ id: "h1", text: "Mi rutina cambió" }],
  };
}

test("end-to-end pipeline: stub → upload → push (mock Pulse)", async (t) => {
  const server = await startMockPulse();
  const rendersDir = mkdtempSync(path.join(tmpdir(), "studio-pipe-"));
  const logsDir = mkdtempSync(path.join(tmpdir(), "studio-pipe-logs-"));
  t.after(async () => {
    await server.close();
    rmSync(rendersDir, { recursive: true, force: true });
    rmSync(logsDir, { recursive: true, force: true });
  });
  process.env.PULSE_API_BASE_URL = `http://127.0.0.1:${server.port}`;
  process.env.PULSE_WORKSPACE_SLUG = "qyro";
  process.env.QYRO_PULSE_API_KEY = "sk_ws_test_key";
  process.env.STUDIO_RENDERS_DIR = rendersDir;
  process.env.STUDIO_LOGS_DIR = logsDir;

  const { resetConfigForTests } = await import("../src/lib/config.js");
  resetConfigForTests();

  const { buildBrief } = await import("../src/lib/brief.js");
  const { proposeConcepts } = await import("../src/lib/concepts.js");
  const { runPipeline } = await import("../src/lib/pipeline.js");

  const b = brain();
  const brief = buildBrief(b, { format: "image" });
  const concepts = proposeConcepts(brief);
  const report = await runPipeline({
    brain: b,
    brief,
    concept: concepts[0],
    apiKey: "sk_ws_test_key",
    workspaceSlug: "qyro",
    skipBranding: true, // no ffmpeg in CI
  });

  assert.equal(report.pushResult?.success, true);
  assert.equal(report.variantsPushed.length, 1);
  assert.equal(report.variantsPushed[0], "instagram_feed");
  assert.equal(server.receivedUploads, 1);
  assert.equal(server.receivedPushes.length, 1);
  // media_url is the mock storage URL, not a local path
  const variant = server.receivedPushes[0].platform_variants.instagram_feed;
  assert.match(variant.media_url, /^http:\/\/mock\.local\//);
});

test("push idempotency: replaying the same external_ref returns the same id", async (t) => {
  const server = await startMockPulse();
  t.after(() => server.close());
  process.env.PULSE_API_BASE_URL = `http://127.0.0.1:${server.port}`;
  const { resetConfigForTests } = await import("../src/lib/config.js");
  resetConfigForTests();

  const { pushToPulse } = await import("../src/lib/push.js");
  const ref = "external-ref-fixed";
  const piece = {
    creativeRunId: ref,
    title: "T",
    format: "image" as const,
    personaId: "p1",
    framework: "AIDA",
    hookText: "h",
    tool: "stub",
    creditsSpent: 0,
    promptHash: "x",
    persona: brain().personas[0],
  };
  const variants = [
    {
      platform: "instagram_feed" as const,
      mediaUrl: "http://mock.local/x.png",
      ratio: "4:5",
      caption: "ok",
      hashtags: [],
      hasLogoOverlay: true,
      hasEarlyHook: true,
      hasBurnedSubtitles: true,
    },
  ];
  const r1 = await pushToPulse(piece, variants, { workspaceSlug: "qyro", apiKey: "k" });
  const r2 = await pushToPulse(piece, variants, { workspaceSlug: "qyro", apiKey: "k" });
  assert.equal(r1.success, true);
  assert.equal(r2.success, true);
  assert.equal(r1.contentPieceId, r2.contentPieceId);
  assert.equal(server.receivedPushes.length, 1, "mock server should only record the push once");
});
