// JSONL append-only logger for creative runs. Each generation, push attempt,
// and push outcome ends up here. Cross-referenceable with the content_piece_id
// returned by Pulse and with future performance metrics.

import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";

export interface CreativeRunEntry {
  timestamp?: string;
  workspace: string;
  tool: string;
  model?: string;
  credits?: number;
  usd?: number | null;
  persona?: string;
  format: string;
  platforms?: string[];
  content_piece_id?: string;
  external_ref?: string;
  prompt_hash?: string;
  push_status?: "ok" | "failed" | "qc_rejected" | "pending";
  push_error?: string;
}

export async function logCreativeRun(entry: CreativeRunEntry): Promise<void> {
  const dir = config().LOGS_DIR;
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, "creative-runs.jsonl");
  const line =
    JSON.stringify({ timestamp: entry.timestamp ?? new Date().toISOString(), ...entry }) + "\n";
  await appendFile(file, line, "utf8");
}
