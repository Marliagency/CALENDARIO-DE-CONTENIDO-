// Credit/budget guard. Sums up the JSONL log for the current calendar month
// and compares against the configured budget. Used by the orchestrator before
// firing any paid generator.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";

export interface SpendSnapshot {
  monthlyCreditsBudget: number;
  creditsSpentThisMonth: number;
  pctUsed: number;
  warn: boolean;
  blockPremium: boolean;
  remaining: number;
}

const PREMIUM_MODELS = new Set([
  "veo_3_1",
  "sora_2",
  "kling_3_premium",
]);

interface RunLog {
  timestamp: string;
  credits?: number;
  model?: string;
}

function isThisMonth(iso: string, now = new Date()): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
}

export async function readSpend(): Promise<SpendSnapshot> {
  const c = config();
  const logPath = path.join(c.LOGS_DIR, "creative-runs.jsonl");
  let lines: string[] = [];
  try {
    const raw = await readFile(logPath, "utf8");
    lines = raw.split(/\r?\n/).filter(Boolean);
  } catch {
    // log file not yet created
  }
  let credits = 0;
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as RunLog;
      if (isThisMonth(entry.timestamp) && typeof entry.credits === "number") {
        credits += entry.credits;
      }
    } catch {
      // skip malformed line
    }
  }
  const budget = c.HIGGSFIELD_MONTHLY_CREDIT_BUDGET;
  const pct = budget > 0 ? (credits / budget) * 100 : 0;
  return {
    monthlyCreditsBudget: budget,
    creditsSpentThisMonth: credits,
    pctUsed: pct,
    warn: pct >= c.HIGGSFIELD_WARN_AT_PCT,
    blockPremium: pct >= c.HIGGSFIELD_BLOCK_PREMIUM_AT_PCT,
    remaining: Math.max(0, budget - credits),
  };
}

export function isPremiumModel(model?: string): boolean {
  if (!model) return false;
  return PREMIUM_MODELS.has(model);
}

export async function guardPaidRun(opts: {
  estimatedCredits?: number;
  model?: string;
}): Promise<{ allowed: boolean; reason?: string; snapshot: SpendSnapshot }> {
  const snapshot = await readSpend();
  if (snapshot.blockPremium && isPremiumModel(opts.model)) {
    return {
      allowed: false,
      reason: `Premium model "${opts.model}" blocked: ${snapshot.pctUsed.toFixed(0)}% of monthly budget already spent.`,
      snapshot,
    };
  }
  const projected = snapshot.creditsSpentThisMonth + (opts.estimatedCredits ?? 0);
  if (projected > snapshot.monthlyCreditsBudget) {
    return {
      allowed: false,
      reason: `Run would exceed monthly budget (projected ${projected} > ${snapshot.monthlyCreditsBudget}).`,
      snapshot,
    };
  }
  return { allowed: true, snapshot };
}
