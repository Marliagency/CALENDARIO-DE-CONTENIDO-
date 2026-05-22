// Common shape for every generator adapter. Each adapter knows how to take
// a brief + a model choice and produce one or more rendered files on disk.
// The pipeline then runs branding + QC + push on the result.

import type { Brief, Platform, Format, ModelChoice } from "../types.js";

export interface GenerateRequest {
  brief: Brief;
  choice: ModelChoice;
  platform: Platform;       // adapter renders one platform at a time
  format: Format;
  conceptHook: string;      // first-line copy / hook for the asset
  outputDir: string;        // absolute path
  dryRun?: boolean;         // if true, write a placeholder and return
}

export interface GenerateOutput {
  mediaPath: string;        // local absolute path to the rendered file
  ratio: string;
  durationSec?: number;     // only for video
  hasEarlyHook: boolean;
  hasBurnedSubtitles: boolean;
  creditsSpent: number;
  modelId: string;
  promptHash: string;
  toolNote?: string;        // free-form, written into creative_run_metadata
}

export interface GeneratorAdapter {
  tool: ModelChoice["tool"];
  isAvailable(): Promise<boolean>;
  generate(req: GenerateRequest): Promise<GenerateOutput>;
}

// Helper: deterministic short hash so the same prompt+brief always reproduces
// the same external_ref / promptHash. Used for idempotency.
import { createHash } from "node:crypto";
export function hashPrompt(parts: unknown[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 24);
}
