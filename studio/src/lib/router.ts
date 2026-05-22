// Model router: picks the cheapest tool that can produce the requested format
// for the given brief. Free-first by default — paid tools are only proposed
// when the brief explicitly disables free_first or the format genuinely needs
// real footage.
//
// Returns a ModelChoice; the caller is responsible for confirming with the
// user when `requiresConfirmation` is true.

import type { Brief, Format, ModelChoice } from "../types.js";

export function chooseModel(format: Format, brief: Brief): ModelChoice {
  const isFreeFirst = brief.freeFirst;
  const avoided = brief.avoidFormats ?? [];

  // Explicit HyperFrames demo
  if (format === "hyperframes_demo") {
    return { tool: "hyperframes", estimatedCost: 0, note: "HTML → MP4 via Playwright" };
  }

  // App / UI demos → HyperFrames if the workspace prefers it, otherwise Remotion
  if (format === "app_demo" || format === "ui_demo") {
    const prefersHyperFrames = brief.primaryFormats.includes("hyperframes_demo");
    if (prefersHyperFrames) {
      return { tool: "hyperframes", estimatedCost: 0, note: "HTML → MP4 via Playwright" };
    }
    return { tool: "remotion", estimatedCost: 0, note: "Local render, no API" };
  }

  // Motion graphics, animated data, typography → Remotion (free)
  if (
    format === "motion_graphic" ||
    format === "data_animation" ||
    format === "text_video"
  ) {
    return { tool: "remotion", estimatedCost: 0, note: "Local render, no API" };
  }

  // SVG animations → MP4 via Playwright + FFmpeg
  if (format === "logo_animation" || format === "svg_motion") {
    return {
      tool: "svg_to_mp4",
      estimatedCost: 0,
      note: "Playwright captures, FFmpeg encodes",
    };
  }

  // Static design / carousel → Canva (free tier) unless workspace avoids it
  if (
    (format === "canva_design" || format === "carousel") &&
    !avoided.includes("canva_design")
  ) {
    return {
      tool: "canva_mcp",
      estimatedCost: 0,
      note: "Canva free tier; Brand Kit needs Canva Pro",
    };
  }

  // Image: free first → mcp-image (Gemini), otherwise Higgsfield
  if (format === "image") {
    if (isFreeFirst) {
      return { tool: "mcp_image", model: "gemini-nano-banana-2", estimatedCost: 0 };
    }
    return {
      tool: "higgsfield_skills",
      command: "/image-generate",
      estimatedCredits: 3,
    };
  }

  // UGC video → free path tries Remotion (graphical UGC); falls back to Higgsfield
  if (format === "ugc_video") {
    if (isFreeFirst && !avoided.includes("ugc_video")) {
      return {
        tool: "remotion",
        estimatedCost: 0,
        note: "Remotion for graphical UGC. Switch to Higgsfield if real footage is needed.",
        alternativeIfRejected: {
          tool: "higgsfield_skills",
          command: "/ugc-video-auto",
          estimatedCredits: 18,
        },
      };
    }
    return {
      tool: "higgsfield_skills",
      command: "/ugc-video-auto",
      estimatedCredits: 18,
    };
  }

  // Voiceover → ElevenLabs free tier
  if (format === "voiceover") {
    return { tool: "elevenlabs_mcp", estimatedCost: 0, note: "Free tier: 10k chars/mo" };
  }

  // Cinematic lifestyle → Higgsfield Veo (expensive, always confirm)
  if (format === "lifestyle_ad") {
    return {
      tool: "higgsfield_skills",
      command: "/image-generate",
      model: "veo_3_1",
      estimatedCredits: 45,
      requiresConfirmation: true,
    };
  }

  // Batch workflow → Pletor (variable cost, always confirm)
  if (brief.isBatch || brief.usePletorWorkflow) {
    return {
      tool: "pletor_mcp",
      requiresConfirmation: true,
      note: "Cost depends on workflow definition",
    };
  }

  // Fallback → mcp-image
  return { tool: "mcp_image", model: "gemini-nano-banana-2", estimatedCost: 0 };
}

export function describeChoice(c: ModelChoice): string {
  const parts: string[] = [`Tool: ${c.tool}`];
  if (c.command) parts.push(`Command: ${c.command}`);
  if (c.model) parts.push(`Model: ${c.model}`);
  if (typeof c.estimatedCredits === "number") parts.push(`Credits: ~${c.estimatedCredits}`);
  else parts.push(`Cost: free`);
  if (c.note) parts.push(`Note: ${c.note}`);
  if (c.requiresConfirmation) parts.push("⚠ Requires explicit confirmation");
  return parts.join(" · ");
}
