// Aggregates creative-runs.jsonl by various dimensions so the CLI can show
// where the credits actually went. Pure (no I/O outside the log file) so
// it's easy to test.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";

export interface RunRow {
  timestamp: string;
  workspace?: string;
  tool?: string;
  model?: string;
  credits?: number;
  usd?: number | null;
  persona?: string;
  format?: string;
  platforms?: string[];
  content_piece_id?: string;
  push_status?: string;
  push_error?: string;
  prompt_hash?: string;
}

export type Dimension = "tool" | "format" | "workspace" | "persona" | "model";

export interface AggBucket {
  key: string;
  credits: number;
  runs: number;
  pieces: number;          // unique content_piece_id
}

function isRecent(iso: string, days: number, now = new Date()): boolean {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return now.getTime() - t <= days * 24 * 60 * 60_000;
}

export async function readRuns(daysBack = 30): Promise<RunRow[]> {
  const file = path.join(config().LOGS_DIR, "creative-runs.jsonl");
  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch {
    return [];
  }
  const rows: RunRow[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line) continue;
    try {
      const row = JSON.parse(line) as RunRow;
      if (isRecent(row.timestamp, daysBack)) rows.push(row);
    } catch {
      // skip malformed line
    }
  }
  return rows;
}

export function aggregate(rows: RunRow[], dim: Dimension): AggBucket[] {
  const buckets = new Map<string, { credits: number; runs: number; pieces: Set<string> }>();
  for (const r of rows) {
    const key = (r[dim] as string) ?? "(unknown)";
    let b = buckets.get(key);
    if (!b) {
      b = { credits: 0, runs: 0, pieces: new Set() };
      buckets.set(key, b);
    }
    b.credits += r.credits ?? 0;
    b.runs += 1;
    if (r.content_piece_id) b.pieces.add(r.content_piece_id);
  }
  return Array.from(buckets, ([key, b]) => ({
    key,
    credits: b.credits,
    runs: b.runs,
    pieces: b.pieces.size,
  })).sort((a, b) => b.credits - a.credits || b.runs - a.runs);
}

export function formatTable(rows: AggBucket[], dimLabel: string): string {
  const header = ["#", dimLabel, "credits", "runs", "pieces"];
  const widths = header.map((h) => h.length);
  const data = rows.map((r, i) => [
    String(i + 1),
    r.key,
    String(r.credits),
    String(r.runs),
    String(r.pieces),
  ]);
  for (const row of data) {
    row.forEach((cell, i) => {
      widths[i] = Math.max(widths[i], cell.length);
    });
  }
  const fmt = (cells: string[]) =>
    cells.map((c, i) => c.padEnd(widths[i])).join("  ");
  return [
    fmt(header),
    widths.map((w) => "-".repeat(w)).join("  "),
    ...data.map(fmt),
  ].join("\n");
}
