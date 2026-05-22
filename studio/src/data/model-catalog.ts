// Catalogue of generator models with their cost and capabilities. The router
// references only models declared here so we never invent or mistype a model
// name. Adapters look up runtime parameters here too (ratios supported,
// max duration, premium flag).
//
// Credits / USD values reflect public list prices at time of writing — adjust
// when providers change pricing. The spend guard uses `premium=true` to block
// expensive models past the configured threshold.

export interface ModelEntry {
  tool:
    | "remotion"
    | "svg_to_mp4"
    | "canva_mcp"
    | "mcp_image"
    | "elevenlabs_mcp"
    | "higgsfield_skills"
    | "pletor_mcp";
  id: string;
  label: string;
  kind: "image" | "video" | "audio" | "design" | "workflow";
  premium?: boolean;
  // Per-output cost. credits for Higgsfield; usd if a flat-fee tool; both
  // optional for free local renderers.
  credits?: number;
  usd?: number;
  // Empty array ⇒ any ratio
  ratios?: string[];
  // Seconds; undefined ⇒ not applicable
  maxDurationSec?: number;
  notes?: string;
}

export const MODEL_CATALOG: ModelEntry[] = [
  // --- Free / local --------------------------------------------------
  {
    tool: "remotion",
    id: "remotion_local",
    label: "Remotion (local render)",
    kind: "video",
    ratios: ["9:16", "1:1", "4:5", "16:9"],
    notes: "Renders React compositions to MP4. Requires ffmpeg + Chromium on PATH.",
  },
  {
    tool: "svg_to_mp4",
    id: "svg_playwright_ffmpeg",
    label: "SVG → MP4 (Playwright + FFmpeg)",
    kind: "video",
    ratios: ["9:16", "1:1", "16:9"],
    maxDurationSec: 60,
  },
  {
    tool: "canva_mcp",
    id: "canva_design",
    label: "Canva via MCP",
    kind: "design",
    notes: "Free tier OK; Brand Kit needs Canva Pro.",
  },
  {
    tool: "mcp_image",
    id: "gemini-nano-banana-2",
    label: "Gemini Nano Banana 2 (mcp-image)",
    kind: "image",
    ratios: ["1:1", "4:5", "9:16", "16:9", "2:3"],
    notes: "Free with a Google AI Studio key.",
  },
  {
    tool: "elevenlabs_mcp",
    id: "eleven_multilingual_v2",
    label: "ElevenLabs Multilingual v2",
    kind: "audio",
    notes: "Free tier: 10k chars/month.",
  },
  // --- Paid / Higgsfield --------------------------------------------
  {
    tool: "higgsfield_skills",
    id: "soul_v2",
    label: "Higgsfield Soul V2 (image)",
    kind: "image",
    credits: 3,
    ratios: ["1:1", "4:5", "9:16", "16:9"],
  },
  {
    tool: "higgsfield_skills",
    id: "nano_banana_2",
    label: "Higgsfield Nano Banana 2 (image, cheap)",
    kind: "image",
    credits: 2,
    ratios: ["1:1", "4:5", "9:16"],
  },
  {
    tool: "higgsfield_skills",
    id: "seedance_2_0",
    label: "Higgsfield Seedance 2.0 (UGC video)",
    kind: "video",
    credits: 18,
    ratios: ["9:16", "1:1"],
    maxDurationSec: 15,
  },
  {
    tool: "higgsfield_skills",
    id: "veo_3_1",
    label: "Higgsfield Veo 3.1 (cinematic)",
    kind: "video",
    credits: 45,
    premium: true,
    ratios: ["9:16", "16:9"],
    maxDurationSec: 10,
    notes: "Always confirm before running.",
  },
  {
    tool: "higgsfield_skills",
    id: "sora_2",
    label: "Higgsfield Sora 2",
    kind: "video",
    credits: 60,
    premium: true,
    ratios: ["16:9", "9:16"],
    maxDurationSec: 12,
  },
  {
    tool: "higgsfield_skills",
    id: "kling_3_premium",
    label: "Higgsfield Kling 3 Premium",
    kind: "video",
    credits: 50,
    premium: true,
    ratios: ["9:16", "1:1", "16:9"],
    maxDurationSec: 10,
  },
  // --- Workflow ------------------------------------------------------
  {
    tool: "pletor_mcp",
    id: "pletor_workflow",
    label: "Pletor MCP (custom workflow)",
    kind: "workflow",
    notes: "Cost depends on workflow definition.",
  },
];

export function findModel(id: string): ModelEntry | undefined {
  return MODEL_CATALOG.find((m) => m.id === id);
}

export function modelsFor(
  tool: ModelEntry["tool"],
  kind?: ModelEntry["kind"],
): ModelEntry[] {
  return MODEL_CATALOG.filter((m) => m.tool === tool && (!kind || m.kind === kind));
}
