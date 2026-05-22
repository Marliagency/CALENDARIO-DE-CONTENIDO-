// Remotion adapter — invokes `npx remotion render` against the workspace's
// Remotion project. Project layout convention:
//
//   studio/remotion-projects/<slug>/
//     src/index.ts           (registers compositions)
//     public/logo.svg
//
// The studio passes brand variables as env so the same composition adapts to
// any workspace.

import { spawn } from "node:child_process";
import { mkdir, access } from "node:fs/promises";
import { constants as FS } from "node:fs";
import path from "node:path";
import {
  hashPrompt,
  type GenerateRequest,
  type GenerateOutput,
  type GeneratorAdapter,
} from "./base.js";

const RATIO_BY_PLATFORM: Record<string, { w: number; h: number; ratio: string }> = {
  tiktok: { w: 1080, h: 1920, ratio: "9:16" },
  instagram_reel: { w: 1080, h: 1920, ratio: "9:16" },
  instagram_feed: { w: 1080, h: 1350, ratio: "4:5" },
  instagram_story: { w: 1080, h: 1920, ratio: "9:16" },
  facebook_reel: { w: 1080, h: 1920, ratio: "9:16" },
  facebook_feed: { w: 1080, h: 1080, ratio: "1:1" },
  youtube_short: { w: 1080, h: 1920, ratio: "9:16" },
  linkedin: { w: 1080, h: 1080, ratio: "1:1" },
  pinterest: { w: 1080, h: 1620, ratio: "2:3" },
  twitter_x: { w: 1920, h: 1080, ratio: "16:9" },
};

function pickComposition(format: string): string {
  if (format === "app_demo" || format === "ui_demo") return "AppDemo";
  if (format === "data_animation" || format === "motion_graphic") return "MetricAnimation";
  if (format === "text_video") return "TypographyPost";
  if (format === "logo_animation") return "BrandIntro";
  return "MetricAnimation";
}

function runRemotion(args: string[], env: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("npx", ["remotion", ...args], {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`remotion exited ${code}: ${stderr.slice(-500)}`));
    });
  });
}

async function projectExists(slug: string): Promise<string | null> {
  const projectRoot = path.resolve("studio/remotion-projects", slug);
  const entry = path.join(projectRoot, "src/index.ts");
  try {
    await access(entry, FS.R_OK);
    return projectRoot;
  } catch {
    return null;
  }
}

export const remotionAdapter: GeneratorAdapter = {
  tool: "remotion",
  async isAvailable() {
    // We don't shell out at boot — having a project folder for the active
    // workspace is the real readiness signal. The CLI's doctor checks the
    // npx remotion binary separately.
    return true;
  },

  async generate(req: GenerateRequest): Promise<GenerateOutput> {
    const dims = RATIO_BY_PLATFORM[req.platform] ?? RATIO_BY_PLATFORM.tiktok;
    const composition = pickComposition(req.format);
    const projectRoot = await projectExists(req.brief.workspace);
    await mkdir(req.outputDir, { recursive: true });
    const outPath = path.join(
      req.outputDir,
      `remotion-${req.brief.workspace}-${composition}-${req.platform}-${Date.now()}.mp4`,
    );

    if (!projectRoot || req.dryRun) {
      // No Remotion project (or dry-run): try the local canvas renderer for
      // formats we know how to draw. It produces a real branded PNG instead
      // of the solid-colour stub, so the pipeline ships something usable.
      // Falls back to stub on unsupported formats or render errors.
      if (!req.dryRun) {
        try {
          const { canvasLocalAdapter } = await import("./canvas-local.js");
          const out = await canvasLocalAdapter.generate(req);
          return { ...out, toolNote: `Canvas local render @ ${dims.w}x${dims.h} (no Remotion project)` };
        } catch {
          // fall through to stub
        }
      }
      const { stubAdapter } = await import("./stub.js");
      const out = await stubAdapter.generate(req);
      return {
        ...out,
        toolNote: projectRoot
          ? "Dry-run; Remotion not invoked."
          : `No Remotion project at studio/remotion-projects/${req.brief.workspace}/ — used stub.`,
      };
    }

    const entry = path.join(projectRoot, "src/index.ts");
    const env: Record<string, string> = {
      BRAND_COLOR_PRIMARY: req.brief.brand.palette,
      BRAND_BG: "#F4F6FB",
      BRAND_LOGO_PATH: req.brief.references.logoUrl ?? "",
      STUDIO_HOOK_TEXT: req.conceptHook,
      STUDIO_TAGLINE: req.brief.brand.tagline,
    };

    await runRemotion(
      [
        "render",
        entry,
        composition,
        outPath,
        "--codec=h264",
        "--width",
        String(dims.w),
        "--height",
        String(dims.h),
      ],
      env,
    );

    return {
      mediaPath: outPath,
      ratio: dims.ratio,
      durationSec: 15,
      hasEarlyHook: true,
      hasBurnedSubtitles: true, // compositions are expected to bake subs in
      creditsSpent: 0,
      modelId: "remotion_local",
      promptHash: hashPrompt([req.brief.workspace, composition, req.platform, req.conceptHook]),
      toolNote: `Remotion composition ${composition} @ ${dims.w}x${dims.h}`,
    };
  },
};
