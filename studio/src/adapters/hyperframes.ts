// HyperFrames adapter — picks an HTML template for the workspace and renders
// it locally via Playwright + FFmpeg. Falls back to the stub if Playwright or
// the workspace's HyperFrames project isn't available so the pipeline keeps
// running end-to-end during early setup.

import { access, mkdir } from "node:fs/promises";
import { constants as FS } from "node:fs";
import path from "node:path";
import {
  hashPrompt,
  type GenerateRequest,
  type GenerateOutput,
  type GeneratorAdapter,
} from "./base.js";
import { stubAdapter } from "./stub.js";

const RATIO_BY_PLATFORM: Record<string, string> = {
  tiktok: "9:16",
  instagram_reel: "9:16",
  instagram_feed: "4:5",
  instagram_story: "9:16",
  facebook_reel: "9:16",
  facebook_feed: "1:1",
  youtube_short: "9:16",
};

function pickTemplate(format: string): { name: string; durationSec: number } {
  if (format === "app_demo" || format === "ui_demo") {
    return { name: "app-demo-30s", durationSec: 30 };
  }
  return { name: "feature-highlight", durationSec: 15 };
}

async function projectExists(slug: string): Promise<string | null> {
  const projectRoot = path.resolve("studio/hyperframes-projects", slug);
  const config = path.join(projectRoot, "hyperframes.config.json");
  try {
    await access(config, FS.R_OK);
    return projectRoot;
  } catch {
    return null;
  }
}

export const hyperframesAdapter: GeneratorAdapter = {
  tool: "svg_to_mp4", // slots into the same dispatcher bucket
  async isAvailable() {
    return true;
  },
  async generate(req: GenerateRequest): Promise<GenerateOutput> {
    const projectRoot = await projectExists(req.brief.workspace);
    if (!projectRoot || req.dryRun) {
      const out = await stubAdapter.generate(req);
      return {
        ...out,
        toolNote: projectRoot
          ? "Dry-run; HyperFrames not invoked."
          : `No HyperFrames project at studio/hyperframes-projects/${req.brief.workspace}/ — used stub.`,
      };
    }

    const { name, durationSec } = pickTemplate(req.format);
    const outputDir = req.outputDir;
    await mkdir(outputDir, { recursive: true });
    const outPath = path.join(
      outputDir,
      `hyperframes-${req.brief.workspace}-${name}-${req.platform}-${Date.now()}.mp4`,
    );

    try {
      const { renderHyperFrames } = await import("../lib/hyperframes-render.js");
      await renderHyperFrames({
        workspaceSlug: req.brief.workspace,
        template: name,
        platform: req.platform,
        durationSec,
        outPath,
        templateProps: { hook: req.conceptHook },
      });
    } catch (err) {
      // Playwright missing or template not built — fall back so the pipeline
      // keeps going. The CLI doctor surfaces what's needed.
      const out = await stubAdapter.generate(req);
      return {
        ...out,
        toolNote: `HyperFrames render failed (${(err as Error).message}). Used stub.`,
      };
    }

    return {
      mediaPath: outPath,
      ratio: RATIO_BY_PLATFORM[req.platform] ?? "9:16",
      durationSec,
      hasEarlyHook: true,
      hasBurnedSubtitles: true,
      creditsSpent: 0,
      modelId: "hyperframes_local",
      promptHash: hashPrompt([req.brief.workspace, name, req.platform, req.conceptHook]),
      toolNote: `HyperFrames template "${name}" rendered locally`,
    };
  },
};
