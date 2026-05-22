// Dispatches a generation request to the right adapter based on the
// ModelChoice produced by chooseModel(). Also enforces the budget guard for
// paid tools.

import type { Brief, Format, ModelChoice, Platform } from "../types.js";
import type { GenerateOutput, GeneratorAdapter } from "../adapters/base.js";
import { remotionAdapter } from "../adapters/remotion.js";
import { stubAdapter } from "../adapters/stub.js";
import {
  canvaAdapter,
  elevenlabsAdapter,
  higgsfieldAdapter,
  mcpImageAdapter,
  pletorAdapter,
  svgToMp4Adapter,
} from "../adapters/external.js";
import { guardPaidRun } from "./spend.js";
import { config } from "./config.js";
import path from "node:path";

const ADAPTERS: Record<ModelChoice["tool"], GeneratorAdapter> = {
  remotion: remotionAdapter,
  svg_to_mp4: svgToMp4Adapter,
  canva_mcp: canvaAdapter,
  mcp_image: mcpImageAdapter,
  elevenlabs_mcp: elevenlabsAdapter,
  higgsfield_skills: higgsfieldAdapter,
  pletor_mcp: pletorAdapter,
};

export interface DispatchInput {
  brief: Brief;
  choice: ModelChoice;
  platform: Platform;
  format: Format;
  conceptHook: string;
  dryRun?: boolean;
}

export interface DispatchOutput extends GenerateOutput {
  tool: ModelChoice["tool"];
}

export async function generateOne(input: DispatchInput): Promise<DispatchOutput> {
  // Spend guard for paid generators
  if ((input.choice.estimatedCredits ?? 0) > 0 && !input.dryRun) {
    const guard = await guardPaidRun({
      estimatedCredits: input.choice.estimatedCredits,
      model: input.choice.model,
    });
    if (!guard.allowed) {
      throw new Error(`Budget guard blocked run: ${guard.reason}`);
    }
  }

  const adapter = ADAPTERS[input.choice.tool] ?? stubAdapter;
  const outputDir = path.resolve(config().RENDERS_DIR, input.brief.workspace);
  const out = await adapter.generate({
    brief: input.brief,
    choice: input.choice,
    platform: input.platform,
    format: input.format,
    conceptHook: input.conceptHook,
    outputDir,
    dryRun: input.dryRun,
  });
  return { ...out, tool: input.choice.tool };
}
