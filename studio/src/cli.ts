#!/usr/bin/env node
// pulse-studio — minimal CLI for the creative studio.
//
// Subcommands:
//   doctor                Run the connection checklist
//   brain [--slug X]      Fetch and summarize the Brand Brain
//   spend                 Show monthly credit usage
//   replay                Replay any pending pushes saved on disk

import {
  config,
  setActiveWorkspace,
  ping,
  getBrandBrain,
  summarizeBrain,
  readSpend,
  replayPendingPushes,
} from "./index.js";

function args(): { cmd: string; flags: Record<string, string | true> } {
  const [, , cmd = "doctor", ...rest] = process.argv;
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    }
  }
  return { cmd, flags };
}

async function doctor() {
  const c = config();
  console.log(`Pulse base URL: ${c.PULSE_API_BASE_URL}`);
  console.log(`Active workspace: ${c.PULSE_WORKSPACE_SLUG}`);
  console.log(`API key configured: ${c.PULSE_API_KEY ? "yes" : "NO"}`);
  const ok = await ping();
  console.log(`/health reachable: ${ok ? "yes" : "NO"}`);
  if (!ok) {
    console.log("→ Start Pulse with `pnpm dev` in the repo root.");
    return;
  }
  if (!c.PULSE_API_KEY) {
    console.log("→ Generate an API key in Pulse and add it to .env.studio.");
    return;
  }
  try {
    const brain = await getBrandBrain(c.PULSE_WORKSPACE_SLUG);
    console.log("\n--- Brand Brain summary ---");
    console.log(summarizeBrain(brain));
  } catch (err) {
    console.log(`Brand Brain fetch failed: ${(err as Error).message}`);
  }
  const spend = await readSpend();
  console.log(
    `\nCredits used this month: ${spend.creditsSpentThisMonth} / ${spend.monthlyCreditsBudget} (${spend.pctUsed.toFixed(0)}%)`,
  );
}

async function brainCmd(slug?: string) {
  const target = slug ?? config().PULSE_WORKSPACE_SLUG;
  if (slug) setActiveWorkspace(slug);
  const brain = await getBrandBrain(target);
  console.log(summarizeBrain(brain));
}

async function spendCmd() {
  const s = await readSpend();
  console.log(JSON.stringify(s, null, 2));
}

async function replayCmd() {
  const c = config();
  if (!c.PULSE_API_KEY) {
    console.log("PULSE_API_KEY not set; cannot replay.");
    return;
  }
  const out = await replayPendingPushes({ apiKey: c.PULSE_API_KEY });
  console.log(`Replayed: ${out.attempted}; ok: ${out.succeeded}; failed: ${out.failed}`);
}

async function main() {
  const { cmd, flags } = args();
  switch (cmd) {
    case "doctor":
      await doctor();
      break;
    case "brain":
      await brainCmd(typeof flags.slug === "string" ? flags.slug : undefined);
      break;
    case "spend":
      await spendCmd();
      break;
    case "replay":
      await replayCmd();
      break;
    default:
      console.log(`Unknown command: ${cmd}`);
      console.log("Available: doctor, brain, spend, replay");
      process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
