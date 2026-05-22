// Cross-references creative-runs.jsonl with the latest performance metrics
// from Pulse. Answers questions like:
//   * Which hook produced the highest engagement?
//   * Which persona × tool combo is most efficient (engagement / credit)?
//   * Which model is the best ROI?
//
// Performance data is the latest snapshot per variant from Pulse's
// GET /content/pieces/:id/performance. We sum reach + impressions across
// variants of the same piece and average engagement_rate.

import { pulseFetch } from "./pulse-api.js";
import { readRuns, type RunRow } from "./spend-report.js";

interface PiecePerformance {
  piece_id: string;
  title: string;
  format: string;
  hook_used: string | null;
  buyer_persona_id: string | null;
  variants: Array<{
    id: string;
    platform: string;
    reach: number | null;
    impressions: number | null;
    views: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    engagement_rate: number | null;
    hook_rate: number | null;
  }>;
}

export interface InsightRow {
  key: string;
  runs: number;
  credits: number;
  reach: number;
  impressions: number;
  engagementSum: number;     // numerator of avg
  engagementSamples: number; // denominator
  efficiency: number;        // reach per credit (∞ if credits=0)
}

export type InsightDim = "hook" | "persona" | "tool" | "model" | "format";

function safeNum(x: number | null | undefined): number {
  return typeof x === "number" && Number.isFinite(x) ? x : 0;
}

async function fetchPerformance(
  slug: string,
  pieceId: string,
): Promise<PiecePerformance | null> {
  try {
    return await pulseFetch<PiecePerformance>(
      `/api/v1/w/${slug}/content/pieces/${pieceId}/performance`,
    );
  } catch {
    // Piece was deleted or metrics not collected — skip silently.
    return null;
  }
}

export async function computeInsights(opts: {
  workspaceSlug: string;
  daysBack?: number;
  dim?: InsightDim;
  apiKey?: string;
}): Promise<InsightRow[]> {
  const days = opts.daysBack ?? 30;
  const dim = opts.dim ?? "hook";
  const runs = (await readRuns(days)).filter(
    (r) => r.content_piece_id && r.workspace === opts.workspaceSlug,
  );

  // Batch performance fetches (deduplicated by piece_id)
  const uniquePieceIds = Array.from(
    new Set(runs.map((r) => r.content_piece_id as string)),
  );
  const perfByPiece = new Map<string, PiecePerformance | null>();
  await Promise.all(
    uniquePieceIds.map(async (id) => {
      perfByPiece.set(id, await fetchPerformance(opts.workspaceSlug, id));
    }),
  );

  const buckets = new Map<string, InsightRow>();
  for (const run of runs) {
    const key = pickKey(run, perfByPiece.get(run.content_piece_id!), dim);
    if (!key) continue;
    const b =
      buckets.get(key) ??
      ({
        key,
        runs: 0,
        credits: 0,
        reach: 0,
        impressions: 0,
        engagementSum: 0,
        engagementSamples: 0,
        efficiency: 0,
      } as InsightRow);
    b.runs += 1;
    b.credits += run.credits ?? 0;
    const perf = perfByPiece.get(run.content_piece_id!);
    if (perf) {
      for (const v of perf.variants) {
        b.reach += safeNum(v.reach);
        b.impressions += safeNum(v.impressions);
        if (typeof v.engagement_rate === "number") {
          b.engagementSum += v.engagement_rate;
          b.engagementSamples += 1;
        }
      }
    }
    buckets.set(key, b);
  }

  for (const b of buckets.values()) {
    b.efficiency = b.credits === 0 ? b.reach : b.reach / b.credits;
  }

  return Array.from(buckets.values()).sort((a, b) => b.efficiency - a.efficiency);
}

function pickKey(
  run: RunRow,
  _perf: PiecePerformance | null | undefined,
  dim: InsightDim,
): string | null {
  switch (dim) {
    case "tool":
      return run.tool ?? null;
    case "model":
      return run.model ?? null;
    case "format":
      return run.format ?? null;
    case "persona":
      return run.persona ?? null;
    case "hook":
      return run.prompt_hash ?? null;
    default:
      return null;
  }
}

export function formatInsights(rows: InsightRow[], dimLabel: string): string {
  if (rows.length === 0) return "No data — push some pieces first.";
  const header = ["#", dimLabel, "runs", "credits", "reach", "avg engagement"];
  const widths = header.map((h) => h.length);
  const data = rows.map((r, i) => [
    String(i + 1),
    r.key.slice(0, 28),
    String(r.runs),
    String(r.credits),
    String(r.reach),
    r.engagementSamples > 0
      ? `${((r.engagementSum / r.engagementSamples) * 100).toFixed(2)}%`
      : "—",
  ]);
  for (const row of data) {
    row.forEach((c, i) => (widths[i] = Math.max(widths[i], c.length)));
  }
  const fmt = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join("  ");
  return [
    fmt(header),
    widths.map((w) => "-".repeat(w)).join("  "),
    ...data.map(fmt),
  ].join("\n");
}
