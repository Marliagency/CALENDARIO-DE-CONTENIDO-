// Adapters for tools whose generation lives outside this Node process:
//
//   higgsfield_skills → Claude Code skill under ~/.claude/skills/higgsfield-*
//   mcp_image         → MCP server (mcp-image) invoked from Claude Code
//   canva_mcp         → Canva MCP via OAuth
//   elevenlabs_mcp    → ElevenLabs MCP
//   pletor_mcp        → Pletor MCP
//
// These adapters cannot themselves call the model — that has to be driven by
// the Claude Code chat session (which is the "studio agent"). What they do is:
//
//   1. Build the prompt + parameters
//   2. Write them as a "render request" JSON file the chat can pick up
//   3. Block on a "render-result" companion file written by the chat (or
//      bypassed in --dry-run via the stub)
//
// In dry-run or when the corresponding MCP / skill isn't installed, every
// external adapter delegates to the stub so the rest of the pipeline keeps
// working end-to-end. The CLI's `doctor` reports which ones are wired.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  hashPrompt,
  type GenerateRequest,
  type GenerateOutput,
  type GeneratorAdapter,
} from "./base.js";
import { stubAdapter } from "./stub.js";
import { findModel } from "../data/model-catalog.js";

interface RenderRequest {
  workspace: string;
  platform: string;
  format: string;
  tool: string;
  command?: string;
  model?: string;
  hook: string;
  brand: GenerateRequest["brief"]["brand"];
  references: { logoUrl?: string };
  createdAt: string;
}

async function writeRenderRequest(req: GenerateRequest): Promise<string> {
  const dir = path.resolve("studio/render-requests");
  await mkdir(dir, { recursive: true });
  const file = path.join(
    dir,
    `${req.choice.tool}-${req.brief.workspace}-${req.platform}-${Date.now()}.json`,
  );
  const payload: RenderRequest = {
    workspace: req.brief.workspace,
    platform: req.platform,
    format: req.format,
    tool: req.choice.tool,
    command: req.choice.command,
    model: req.choice.model,
    hook: req.conceptHook,
    brand: req.brief.brand,
    references: { logoUrl: req.brief.references.logoUrl },
    createdAt: new Date().toISOString(),
  };
  await writeFile(file, JSON.stringify(payload, null, 2), "utf8");
  return file;
}

async function delegateToStub(
  req: GenerateRequest,
  reason: string,
  modelIdHint?: string,
): Promise<GenerateOutput> {
  const out = await stubAdapter.generate(req);
  return {
    ...out,
    modelId: modelIdHint ?? out.modelId,
    toolNote: reason,
  };
}

function makeExternalAdapter(tool: GeneratorAdapter["tool"]): GeneratorAdapter {
  return {
    tool,
    async isAvailable() {
      // We can't reliably detect whether the user's Claude Code session has
      // the skill / MCP server connected; the CLI doctor prompts the user.
      return true;
    },
    async generate(req: GenerateRequest): Promise<GenerateOutput> {
      if (req.dryRun) {
        return delegateToStub(req, `Dry-run; would call ${tool}.`);
      }
      const reqFile = await writeRenderRequest(req);
      // The pipeline emits a render request file. The Claude Code chat
      // picks it up, runs the skill / MCP call, and writes back a result
      // file. In automated runs (no chat session) the stub fills in so the
      // push pipeline still runs.
      const model = req.choice.model ? findModel(req.choice.model) : undefined;
      return delegateToStub(
        req,
        `Pending external render. Request file: ${reqFile}. Resolve via Claude Code (${tool}).`,
        model?.id ?? `${tool}-pending`,
      );
    },
  };
}

export const higgsfieldAdapter = makeExternalAdapter("higgsfield_skills");
export const mcpImageAdapter = makeExternalAdapter("mcp_image");
export const canvaAdapter = makeExternalAdapter("canva_mcp");
export const elevenlabsAdapter = makeExternalAdapter("elevenlabs_mcp");
export const pletorAdapter = makeExternalAdapter("pletor_mcp");
export const svgToMp4Adapter = makeExternalAdapter("svg_to_mp4");
