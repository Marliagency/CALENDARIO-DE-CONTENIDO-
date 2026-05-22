// Pushes a generated piece to Pulse via POST /api/v1/ingest/content-pieces.
//
// Idempotency: `external_ref` (= creativeRunId) is reused as the Idempotency-Key.
// Pulse upserts on external_ref so safe to retry.
//
// Network resilience: exponential backoff (5s → 30s → 5min) for transient
// errors. 4xx (validation) is NOT retried — it indicates a bug in our payload.
// If all attempts fail, the payload is appended to studio/pending-pushes.jsonl
// for replay on the next session.

import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";
import { logCreativeRun, type CreativeRunEntry } from "./logger.js";
import { PulseApiError, pulseFetch } from "./pulse-api.js";
import type { ContentPiece, PlatformVariant, PushPayload, PushResult } from "../types.js";

const BACKOFFS_MS = [5_000, 30_000, 5 * 60_000];

function buildVariantsPayload(variants: PlatformVariant[]) {
  const out: PushPayload["platform_variants"] = {};
  for (const v of variants) {
    out[v.platform] = {
      media_url: v.mediaUrl,
      ratio: v.ratio,
      duration_s: v.durationSec,
      caption: v.caption,
      hashtags: v.hashtags,
      first_comment: v.firstComment,
      cta_text: v.ctaText,
      cta_url: v.ctaUrl,
    };
  }
  return out;
}

function buildSchedule(variants: PlatformVariant[], _persona: ContentPiece["persona"]) {
  // Suggest one slot per variant at "now + 24h, staggered 30min apart".
  // The user reviews and reschedules from the queue UI.
  const base = Date.now() + 24 * 60 * 60_000;
  const schedule: Record<string, string> = {};
  variants.forEach((v, i) => {
    schedule[v.platform] = new Date(base + i * 30 * 60_000).toISOString();
  });
  return schedule;
}

function buildPayload(piece: ContentPiece, variants: PlatformVariant[]): PushPayload {
  return {
    external_ref: piece.creativeRunId,
    title: piece.title,
    format: piece.format,
    buyer_persona_id: piece.personaId,
    campaign_id: piece.campaignId ?? null,
    framework_used: piece.framework,
    hook_used: piece.hookText,
    creative_run_metadata: {
      tool: piece.tool,
      model: piece.model,
      credits_spent: piece.creditsSpent,
      prompt_hash: piece.promptHash,
    },
    platform_variants: buildVariantsPayload(variants),
    suggested_schedule: buildSchedule(variants, piece.persona),
    suggested_boost_budget_eur: piece.suggestedBoost ?? 0,
  };
}

export async function pushToPulse(
  piece: ContentPiece,
  variants: PlatformVariant[],
  opts: { workspaceSlug: string; apiKey: string },
): Promise<PushResult> {
  const payload = buildPayload(piece, variants);
  const logBase: CreativeRunEntry = {
    workspace: opts.workspaceSlug,
    tool: piece.tool,
    model: piece.model,
    credits: piece.creditsSpent,
    persona: piece.persona.name,
    format: piece.format,
    platforms: variants.map((v) => v.platform),
    external_ref: piece.creativeRunId,
    prompt_hash: piece.promptHash,
  };

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= BACKOFFS_MS.length; attempt++) {
    try {
      const resp = await pulseFetch<{ content_piece_id: string }>(
        "/api/v1/ingest/content-pieces",
        {
          method: "POST",
          body: payload,
          headers: { "Idempotency-Key": piece.creativeRunId },
          apiKey: opts.apiKey,
          timeoutMs: 10_000,
        },
      );
      await logCreativeRun({
        ...logBase,
        content_piece_id: resp.content_piece_id,
        push_status: "ok",
      });
      return { success: true, contentPieceId: resp.content_piece_id };
    } catch (err) {
      lastError = err;
      const status = err instanceof PulseApiError ? err.status : 0;
      // 422 / 400 → don't retry, payload is wrong
      if (status === 422 || status === 400) {
        await logCreativeRun({
          ...logBase,
          push_status: "failed",
          push_error: `${status}: ${JSON.stringify((err as PulseApiError).data)}`,
        });
        return { success: false, status, error: (err as Error).message };
      }
      const backoff = BACKOFFS_MS[attempt];
      if (backoff === undefined) break;
      await new Promise((r) => setTimeout(r, backoff));
    }
  }

  // All retries exhausted — persist for replay
  await persistPending(payload);
  await logCreativeRun({
    ...logBase,
    push_status: "pending",
    push_error: lastError instanceof Error ? lastError.message : String(lastError),
  });
  return {
    success: false,
    error:
      "Push failed after retries; saved to pending queue. Replay with `pulse-studio replay`.",
  };
}

async function persistPending(payload: PushPayload): Promise<void> {
  const file = config().PENDING_QUEUE_PATH;
  await mkdir(path.dirname(file), { recursive: true });
  await appendFile(file, JSON.stringify(payload) + "\n", "utf8");
}

export async function replayPendingPushes(opts: { apiKey: string }): Promise<{
  attempted: number;
  succeeded: number;
  failed: number;
}> {
  const file = config().PENDING_QUEUE_PATH;
  let lines: string[] = [];
  try {
    const raw = await readFile(file, "utf8");
    lines = raw.split(/\r?\n/).filter(Boolean);
  } catch {
    return { attempted: 0, succeeded: 0, failed: 0 };
  }
  const remaining: string[] = [];
  let succeeded = 0;
  let failed = 0;
  for (const line of lines) {
    let payload: PushPayload;
    try {
      payload = JSON.parse(line);
    } catch {
      continue; // drop malformed lines
    }
    try {
      await pulseFetch<{ content_piece_id: string }>("/api/v1/ingest/content-pieces", {
        method: "POST",
        body: payload,
        headers: { "Idempotency-Key": payload.external_ref },
        apiKey: opts.apiKey,
      });
      succeeded++;
    } catch (err) {
      const status = err instanceof PulseApiError ? err.status : 0;
      if (status === 422 || status === 400) {
        failed++;
        continue; // drop poisoned message
      }
      remaining.push(line);
      failed++;
    }
  }
  await writeFile(file, remaining.length ? remaining.join("\n") + "\n" : "", "utf8");
  return { attempted: lines.length, succeeded, failed };
}
