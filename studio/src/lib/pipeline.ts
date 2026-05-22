// Pipeline orchestrator — the full Phase 3 flow:
//
//   Brief → Concepts (caller picks one) → per-platform generate
//        → branding overlay → QC → upload → push to Pulse
//
// QC failures regenerate once. If the retry also fails the variant is dropped
// from the push but the other variants are still shipped. The caller (CLI
// or chat) is responsible for asking the user to pick a concept; the
// orchestrator just accepts the chosen Concept.

import path from "node:path";
import { randomUUID } from "node:crypto";
import { applyBranding } from "./branding.js";
import { buildCaption } from "./caption.js";
import { config } from "./config.js";
import { generateOne } from "./generate.js";
import { logCreativeRun } from "./logger.js";
import { qcCheck, explainFailure } from "./qc.js";
import { pushToPulse } from "./push.js";
import { chooseModel } from "./router.js";
import { uploadCreative } from "./upload.js";
import type {
  BrandBrain,
  Brief,
  Concept,
  ContentPiece,
  PlatformVariant,
  Platform,
  PushResult,
} from "../types.js";

export interface PipelineOptions {
  brain: BrandBrain;
  brief: Brief;
  concept: Concept;
  dryRun?: boolean;
  skipBranding?: boolean;       // for environments without ffmpeg
  skipUpload?: boolean;          // pushes media_url=file://... (dev only)
  apiKey: string;
  workspaceSlug: string;
}

export interface PipelineReport {
  pushResult: PushResult | null;
  variantsPushed: Platform[];
  variantsRejected: { platform: Platform; reasons: string[] }[];
  creditsSpent: number;
  contentPieceId?: string;
  reviewUrl?: string;
}

async function generateAndQc(
  opts: PipelineOptions,
  platform: Platform,
): Promise<{ variant: PlatformVariant; creditsSpent: number; modelId: string } | { rejected: string[] }> {
  const choice = chooseModel(opts.brief.format, opts.brief);

  let lastFailures: string[] = [];
  let creditsSpent = 0;
  let modelId = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    const out = await generateOne({
      brief: opts.brief,
      choice,
      platform,
      format: opts.brief.format,
      conceptHook: opts.concept.hook,
      dryRun: opts.dryRun,
    });
    creditsSpent = out.creditsSpent;
    modelId = out.modelId;

    // Branding overlay (best-effort: skip on ffmpeg-less environments).
    // When the caller passes skipBranding=true the QC `logo_present` rule
    // is treated as satisfied — the caller is explicitly opting out, usually
    // for tests or dev environments without ffmpeg.
    let mediaPath = out.mediaPath;
    let hasLogoOverlay = opts.skipBranding === true;
    if (!opts.skipBranding) {
      try {
        mediaPath = await applyBranding(out.mediaPath, platform, opts.brain);
        hasLogoOverlay = mediaPath !== out.mediaPath;
      } catch {
        // Branding failed (ffmpeg missing, no logo) — QC will fail and
        // either regenerate or drop the variant.
        hasLogoOverlay = false;
      }
    }

    const { caption, hashtags, firstComment } = buildCaption(platform, {
      brain: opts.brain,
      concept: opts.concept,
      personaName: opts.brief.persona.name,
      cta: opts.brief.persona.preferredCta ?? null,
    });

    const variant: PlatformVariant = {
      platform,
      mediaUrl: mediaPath,
      ratio: out.ratio,
      durationSec: out.durationSec,
      caption,
      hashtags,
      firstComment,
      ctaText: opts.brief.persona.preferredCta ?? undefined,
      hasLogoOverlay,
      hasEarlyHook: out.hasEarlyHook,
      hasBurnedSubtitles: out.hasBurnedSubtitles,
    };

    const qc = qcCheck(variant, opts.brain);
    if (qc.passed) {
      return { variant, creditsSpent, modelId };
    }
    lastFailures = qc.failed;
    // Don't auto-retry for failures we know a regenerate won't fix
    const unfixable = qc.failed.every((f) =>
      ["caption_length", "hashtag_count", "no_forbidden_claims"].includes(f),
    );
    if (unfixable) break;
  }

  return { rejected: lastFailures };
}

export async function runPipeline(opts: PipelineOptions): Promise<PipelineReport> {
  const variants: PlatformVariant[] = [];
  const rejected: { platform: Platform; reasons: string[] }[] = [];
  let creditsSpent = 0;
  let modelId = "";

  for (const platform of opts.concept.platforms) {
    const result = await generateAndQc(opts, platform);
    if ("rejected" in result) {
      rejected.push({ platform, reasons: result.rejected });
      continue;
    }
    creditsSpent += result.creditsSpent;
    modelId = result.modelId;

    // Upload to Pulse so push payload has a real URL
    let mediaUrl = result.variant.mediaUrl;
    if (!opts.skipUpload) {
      try {
        const up = await uploadCreative(result.variant.mediaUrl, opts.apiKey);
        mediaUrl = up.url;
      } catch (err) {
        rejected.push({ platform, reasons: [`upload_failed: ${(err as Error).message}`] });
        continue;
      }
    } else {
      mediaUrl = `file://${path.resolve(result.variant.mediaUrl)}`;
    }
    variants.push({ ...result.variant, mediaUrl });
  }

  if (variants.length === 0) {
    await logCreativeRun({
      workspace: opts.workspaceSlug,
      tool: "pipeline",
      model: modelId,
      credits: creditsSpent,
      persona: opts.brief.persona.name,
      format: opts.brief.format,
      platforms: opts.concept.platforms,
      push_status: "qc_rejected",
      push_error: JSON.stringify(rejected),
    });
    return {
      pushResult: null,
      variantsPushed: [],
      variantsRejected: rejected,
      creditsSpent,
    };
  }

  const piece: ContentPiece = {
    creativeRunId: randomUUID(),
    title: `${opts.concept.title} (${opts.brief.persona.name})`,
    format: opts.brief.format,
    personaId: opts.brief.persona.id,
    campaignId: opts.brief.campaignId,
    framework: "AIDA",
    hookText: opts.concept.hook,
    tool: "studio-pipeline",
    model: modelId,
    creditsSpent,
    promptHash: opts.concept.hook,
    persona: opts.brief.persona,
  };

  const pushResult = await pushToPulse(piece, variants, {
    workspaceSlug: opts.workspaceSlug,
    apiKey: opts.apiKey,
  });

  const reviewUrl = pushResult.contentPieceId
    ? `${config().PULSE_API_BASE_URL.replace(/:\d+/, ":5173")}/w/${opts.workspaceSlug}/queue?piece=${pushResult.contentPieceId}`
    : undefined;

  return {
    pushResult,
    variantsPushed: variants.map((v) => v.platform),
    variantsRejected: rejected,
    creditsSpent,
    contentPieceId: pushResult.contentPieceId,
    reviewUrl,
  };
}

export function formatPipelineReport(report: PipelineReport, brain: BrandBrain): string {
  const lines: string[] = [];
  if (report.pushResult?.success) {
    lines.push(`✓ Pieza creada en Pulse`);
    lines.push(`  Workspace: ${brain.slug}`);
    lines.push(`  ID: ${report.contentPieceId}`);
    lines.push(`  Variantes pusheadas: ${report.variantsPushed.join(", ") || "—"}`);
    if (report.reviewUrl) lines.push(`  Revisar: ${report.reviewUrl}`);
  } else {
    lines.push(`✗ Push falló o no se generó ninguna variante`);
    if (report.pushResult?.error) lines.push(`  ${report.pushResult.error}`);
  }
  if (report.variantsRejected.length > 0) {
    lines.push(`  Rechazadas:`);
    for (const r of report.variantsRejected) {
      lines.push(`    · ${r.platform}: ${r.reasons.map(explainFailure).join("; ")}`);
    }
  }
  lines.push(`  Créditos gastados: ${report.creditsSpent}`);
  return lines.join("\n");
}
