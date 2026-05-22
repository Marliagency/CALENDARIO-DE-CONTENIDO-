#!/usr/bin/env node
// pulse-studio — minimal CLI for the creative studio.
//
// Subcommands:
//   doctor                    Run the Phase 0 connection checklist
//   brain [--slug X]          Fetch and summarize the Brand Brain
//   spend                     Show monthly credit usage
//   replay                    Replay any pending pushes saved on disk
//
//   --- Phase 1 ---
//   smoke                     Generate a stub image, brand it, push to Pulse
//
//   --- Phase 2 ---
//   test-overlay              Burn the workspace logo onto a stub image for
//                             every platform; saves to studio/cache/test-overlays/
//
//   --- Phase 3 ---
//   propose --format F        Build a brief and print 3 concepts (JSON)
//   generate --format F --concept N [--dry-run] [--skip-branding]
//                             Run the full pipeline: generate → brand → QC →
//                             upload → push

import path from "node:path";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  config,
  setActiveWorkspace,
  ping,
  getBrandBrain,
  summarizeBrain,
  readSpend,
  replayPendingPushes,
  buildBrief,
  chooseModel,
  applyBranding,
  pushToPulse,
} from "./index.js";
import { stubAdapter } from "./adapters/stub.js";
import { uploadCreative } from "./lib/upload.js";
import { proposeConcepts } from "./lib/concepts.js";
import { runPipeline, formatPipelineReport } from "./lib/pipeline.js";
import { invalidateBrandBrain } from "./lib/brand-brain.js";
import { computeInsights, formatInsights, type InsightDim } from "./lib/insights.js";
import type { Format, Platform } from "./types.js";

function args(): { cmd: string; flags: Record<string, string | true> } {
  const [, , cmd = "doctor", ...rest] = process.argv;
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    }
  }
  return { cmd, flags };
}

async function doctor() {
  const c = config();
  console.log(`Pulse base URL: ${c.PULSE_API_BASE_URL}`);
  console.log(`Active workspace: ${c.PULSE_WORKSPACE_SLUG}`);
  console.log(`API key configured: ${c.PULSE_API_KEY ? "yes" : "NO"}`);
  const ok = await ping();
  console.log(`/health reachable: ${ok ? "yes" : "NO"}`);
  if (!ok) {
    console.log("→ Start Pulse with `pnpm dev` in the repo root.");
    return;
  }
  if (!c.PULSE_API_KEY) {
    console.log("→ Generate an API key in Pulse and add it to .env.studio.");
    return;
  }
  try {
    const brain = await getBrandBrain(c.PULSE_WORKSPACE_SLUG);
    console.log("\n--- Brand Brain summary ---");
    console.log(summarizeBrain(brain));
  } catch (err) {
    console.log(`Brand Brain fetch failed: ${(err as Error).message}`);
  }
  const spend = await readSpend();
  console.log(
    `\nCredits used this month: ${spend.creditsSpentThisMonth} / ${spend.monthlyCreditsBudget} (${spend.pctUsed.toFixed(0)}%)`,
  );
}

async function brainCmd(slug?: string) {
  const target = slug ?? config().PULSE_WORKSPACE_SLUG;
  if (slug) setActiveWorkspace(slug);
  const brain = await getBrandBrain(target);
  console.log(summarizeBrain(brain));
}

async function spendCmd(flags: Record<string, string | true>) {
  const s = await readSpend();
  console.log(`Budget:         ${s.creditsSpentThisMonth} / ${s.monthlyCreditsBudget} credits`);
  console.log(`Used:           ${s.pctUsed.toFixed(0)}%`);
  console.log(`Remaining:      ${s.remaining}`);
  if (s.warn) console.log(`⚠ Over warn threshold (${config().HIGGSFIELD_WARN_AT_PCT}%)`);
  if (s.blockPremium) console.log(`⛔ Premium models blocked (>= ${config().HIGGSFIELD_BLOCK_PREMIUM_AT_PCT}%)`);

  if (flags.report) {
    const { readRuns, aggregate, formatTable } = await import("./lib/spend-report.js");
    const days = Number(typeof flags.days === "string" ? flags.days : "30");
    const dim = (typeof flags.by === "string" ? flags.by : "tool") as
      | "tool"
      | "format"
      | "workspace"
      | "persona"
      | "model";
    const rows = await readRuns(days);
    const agg = aggregate(rows, dim);
    console.log(`\n--- Last ${days} days, grouped by ${dim} ---`);
    console.log(formatTable(agg, dim));
  }
}

async function replayCmd() {
  const c = config();
  if (!c.PULSE_API_KEY) {
    console.log("PULSE_API_KEY not set; cannot replay.");
    return;
  }
  const out = await replayPendingPushes({ apiKey: c.PULSE_API_KEY });
  console.log(`Replayed: ${out.attempted}; ok: ${out.succeeded}; failed: ${out.failed}`);
}

async function smokeCmd(flags: Record<string, string | true>) {
  const c = config();
  const slug = (typeof flags.slug === "string" ? flags.slug : c.PULSE_WORKSPACE_SLUG);
  const skipBranding = flags["skip-branding"] === true;
  const brain = await getBrandBrain(slug);
  if (brain.personas.length === 0) {
    console.log("Workspace has no personas — add at least one in Pulse before the smoke test.");
    return;
  }
  const brief = buildBrief(brain, { format: "image" });
  console.log(`Generating stub image for ${slug}/${brief.persona.name}...`);
  const outputDir = path.resolve(c.RENDERS_DIR, slug);
  await mkdir(outputDir, { recursive: true });
  const out = await stubAdapter.generate({
    brief,
    choice: chooseModel("image", brief),
    platform: "instagram_feed",
    format: "image",
    conceptHook: "Smoke test",
    outputDir,
  });
  let mediaPath = out.mediaPath;
  if (!skipBranding) {
    try {
      mediaPath = await applyBranding(mediaPath, "instagram_feed", brain);
      console.log(`Branding overlay applied → ${mediaPath}`);
    } catch (err) {
      console.log(`Branding skipped: ${(err as Error).message}`);
    }
  }
  console.log(`Uploading to Pulse...`);
  const up = await uploadCreative(mediaPath);
  console.log(`Uploaded → ${up.url}`);

  console.log(`Pushing content piece...`);
  const push = await pushToPulse(
    {
      creativeRunId: randomUUID(),
      title: `Smoke test ${new Date().toISOString().slice(0, 10)}`,
      format: "image",
      personaId: brief.persona.id,
      framework: "smoke",
      hookText: "Smoke test",
      tool: "stub",
      model: out.modelId,
      creditsSpent: 0,
      promptHash: out.promptHash,
      persona: brief.persona,
    },
    [
      {
        platform: "instagram_feed",
        mediaUrl: up.url,
        ratio: "4:5",
        caption: "Smoke test desde el estudio",
        hashtags: [`#${slug.replace(/-/g, "")}`],
        hasLogoOverlay: !skipBranding,
        hasEarlyHook: true,
        hasBurnedSubtitles: true,
      },
    ],
    { workspaceSlug: slug, apiKey: c.PULSE_API_KEY },
  );
  if (push.success) {
    console.log(`✓ content_piece_id: ${push.contentPieceId}`);
    console.log(`  Review at http://localhost:5173/w/${slug}/queue?piece=${push.contentPieceId}`);
  } else {
    console.log(`✗ Push failed: ${push.error}`);
  }
}

async function testOverlayCmd(flags: Record<string, string | true>) {
  const c = config();
  const slug = (typeof flags.slug === "string" ? flags.slug : c.PULSE_WORKSPACE_SLUG);
  const brain = await getBrandBrain(slug);
  if (brain.personas.length === 0) {
    console.log("Workspace has no personas — fill Brand Brain in Pulse first.");
    return;
  }
  const brief = buildBrief(brain, { format: "image" });
  const outDir = path.resolve("studio/cache/test-overlays", slug);
  await mkdir(outDir, { recursive: true });
  const platforms: Platform[] = [
    "tiktok",
    "instagram_reel",
    "instagram_feed",
    "instagram_story",
    "facebook_feed",
    "youtube_short",
  ];
  for (const platform of platforms) {
    const base = await stubAdapter.generate({
      brief,
      choice: chooseModel("image", brief),
      platform,
      format: "image",
      conceptHook: "overlay test",
      outputDir: outDir,
    });
    try {
      const branded = await applyBranding(base.mediaPath, platform, brain);
      console.log(`${platform.padEnd(20)} → ${path.relative(process.cwd(), branded)}`);
    } catch (err) {
      console.log(`${platform.padEnd(20)} FAILED: ${(err as Error).message}`);
    }
  }
}

async function proposeCmd(flags: Record<string, string | true>) {
  const c = config();
  const slug = (typeof flags.slug === "string" ? flags.slug : c.PULSE_WORKSPACE_SLUG);
  const format = (typeof flags.format === "string" ? flags.format : "ugc_video") as Format;
  const brain = await getBrandBrain(slug);
  const brief = buildBrief(brain, {
    format,
    personaId: typeof flags.persona === "string" ? flags.persona : undefined,
  });
  const concepts = proposeConcepts(brief);
  console.log(JSON.stringify(concepts, null, 2));
}

async function generateCmd(flags: Record<string, string | true>) {
  const c = config();
  const slug = (typeof flags.slug === "string" ? flags.slug : c.PULSE_WORKSPACE_SLUG);
  const format = (typeof flags.format === "string" ? flags.format : "ugc_video") as Format;
  const conceptIndex = Number(typeof flags.concept === "string" ? flags.concept : "1");
  const dryRun = flags["dry-run"] === true;
  const skipBranding = flags["skip-branding"] === true;
  const skipUpload = flags["skip-upload"] === true;

  const brain = await getBrandBrain(slug);
  const brief = buildBrief(brain, {
    format,
    personaId: typeof flags.persona === "string" ? flags.persona : undefined,
  });
  const concepts = proposeConcepts(brief);
  const concept = concepts.find((c) => c.index === conceptIndex) ?? concepts[0];

  const spend = await readSpend();
  if (spend.warn) {
    console.log(
      `⚠ Already at ${spend.pctUsed.toFixed(0)}% of the monthly budget (${spend.creditsSpentThisMonth}/${spend.monthlyCreditsBudget} credits).`,
    );
  }
  if (spend.blockPremium) {
    console.log(`⛔ Premium models will be blocked this run.`);
  }
  console.log(`Running pipeline for concept #${concept.index}: ${concept.title}`);

  const report = await runPipeline({
    brain,
    brief,
    concept,
    dryRun,
    skipBranding,
    skipUpload,
    apiKey: c.PULSE_API_KEY,
    workspaceSlug: slug,
  });
  console.log(formatPipelineReport(report, brain));
}

async function switchCmd(slug?: string) {
  if (!slug) {
    console.log("Usage: pulse-studio switch <slug>");
    process.exit(2);
  }
  const before = config().PULSE_WORKSPACE_SLUG;
  setActiveWorkspace(slug);
  invalidateBrandBrain(before);
  invalidateBrandBrain(slug);
  console.log(`Switched: ${before} → ${slug}`);
  // Pre-warm the new brain so subsequent commands feel snappy.
  try {
    const brain = await getBrandBrain(slug);
    console.log("\n--- New workspace summary ---");
    console.log(summarizeBrain(brain));
  } catch (err) {
    console.log(`Brain fetch failed: ${(err as Error).message}`);
  }
}

async function insightsCmd(flags: Record<string, string | true>) {
  const c = config();
  const slug = typeof flags.slug === "string" ? flags.slug : c.PULSE_WORKSPACE_SLUG;
  const days = Number(typeof flags.days === "string" ? flags.days : "30");
  const dim = (typeof flags.by === "string" ? flags.by : "tool") as InsightDim;

  const rows = await computeInsights({
    workspaceSlug: slug,
    daysBack: days,
    dim,
    apiKey: c.PULSE_API_KEY,
  });
  console.log(`Last ${days} days · workspace=${slug} · grouped by ${dim}`);
  console.log(formatInsights(rows, dim));
}

async function hyperframesRenderCmd(flags: Record<string, string | true>) {
  const c = config();
  const slug = typeof flags.slug === "string" ? flags.slug : c.PULSE_WORKSPACE_SLUG;
  const template = typeof flags.template === "string" ? flags.template : "app-demo-30s";
  const platform = (typeof flags.platform === "string" ? flags.platform : "tiktok") as Platform;
  const duration = Number(typeof flags.duration === "string" ? flags.duration : "30");

  const outDir = path.resolve(c.RENDERS_DIR, slug);
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `hyperframes-${template}-${platform}-${Date.now()}.mp4`);

  try {
    const { renderHyperFrames } = await import("./lib/hyperframes-render.js");
    await renderHyperFrames({
      workspaceSlug: slug,
      template,
      platform,
      durationSec: duration,
      outPath,
    });
    console.log(`✓ Rendered to ${outPath}`);
  } catch (err) {
    console.log(`✗ HyperFrames render failed: ${(err as Error).message}`);
    console.log("  Make sure playwright + ffmpeg are installed locally.");
  }
}

async function main() {
  const { cmd, flags } = args();
  switch (cmd) {
    case "doctor":
      await doctor();
      break;
    case "brain":
      await brainCmd(typeof flags.slug === "string" ? flags.slug : undefined);
      break;
    case "spend":
      await spendCmd(flags);
      break;
    case "replay":
      await replayCmd();
      break;
    case "smoke":
      await smokeCmd(flags);
      break;
    case "test-overlay":
      await testOverlayCmd(flags);
      break;
    case "propose":
      await proposeCmd(flags);
      break;
    case "generate":
      await generateCmd(flags);
      break;
    case "hyperframes-render":
      await hyperframesRenderCmd(flags);
      break;
    case "switch":
      // The slug comes positionally: `pulse-studio switch <slug>`
      await switchCmd(process.argv[3]);
      break;
    case "insights":
      await insightsCmd(flags);
      break;
    default:
      console.log(`Unknown command: ${cmd}`);
      console.log(
        "Available: doctor, brain, spend, replay, smoke, test-overlay, propose, generate, hyperframes-render, switch, insights",
      );
      process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
