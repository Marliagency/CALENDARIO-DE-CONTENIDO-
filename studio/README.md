# @pulse/studio — Creative Studio (Session 2)

Generates content (UGC, motion graphics, carousels, voiceovers, images) and
pushes it to Pulse as `IN_REVIEW` pieces ready for human approval.

This package is the **Session 2** half of the architecture; the other half is
Pulse itself (the API + calendar + queue). The two sides communicate only via
`POST /api/v1/ingest/content-pieces` and the Brand Brain endpoints.

## Quick start

```bash
# 1. Copy env template at the repo root
cp .env.studio.example .env.studio
# 2. Fill PULSE_API_KEY and per-workspace keys (generate in Pulse UI)
# 3. Boot Pulse in another terminal
pnpm dev
# 4. Run the studio doctor
pnpm --filter @pulse/studio studio doctor
```

`doctor` prints:
- Whether Pulse `/health` responds
- Whether the active workspace's Brand Brain is reachable
- A brief summary of personas / hooks / claims / assets
- Anything missing from the Brain that would block generation
- Monthly credit usage

## Available subcommands

```bash
# Phase 0 — verify the environment
pnpm --filter @pulse/studio studio doctor
pnpm --filter @pulse/studio studio brain --slug qyro
pnpm --filter @pulse/studio studio spend
pnpm --filter @pulse/studio studio replay         # retries pushes saved on disk

# Phase 1 — smoke test
pnpm --filter @pulse/studio studio smoke           # generates a stub PNG,
                                                   # brands it, uploads to Pulse,
                                                   # pushes it as IN_REVIEW
pnpm --filter @pulse/studio studio smoke --skip-branding   # no ffmpeg env

# Phase 2 — branding overlay
pnpm --filter @pulse/studio studio test-overlay    # writes branded variants for
                                                   # all platforms under
                                                   # studio/cache/test-overlays/

# Phase 3 — full pipeline
pnpm --filter @pulse/studio studio propose --format ugc_video
pnpm --filter @pulse/studio studio generate --format ugc_video --concept 1
pnpm --filter @pulse/studio studio generate --format image --concept 2 --dry-run
```

### Pipeline contract

`generate` runs:

1. Build brief from Brand Brain.
2. Propose 3 concepts; CLI picks the one matching `--concept`.
3. For each target platform → pick a model via `chooseModel` → generate the
   asset (Remotion locally, or stub if the adapter is external and not yet
   wired in this session) → branding overlay → caption build → QC → upload to
   Pulse → push.
4. QC failures regenerate once. If the retry also fails the variant is dropped
   from the push; surviving variants still ship.

### External tool adapters (Higgsfield / Canva / mcp-image / ElevenLabs / Pletor)

Those models can't run inside this Node process — they live in MCP servers or
Claude Code skills. The adapter writes a `studio/render-requests/*.json` file
describing what to generate; the Claude Code chat (acting as the studio agent)
picks it up, invokes the skill / MCP, and writes the resulting file to
`studio/renders/`. In `--dry-run` mode every external adapter falls back to
the stub so the rest of the pipeline still runs end-to-end.

## Architecture

```
┌──────────────────────────┐         ┌──────────────────────────┐
│  This package (studio)   │         │   Pulse API              │
│                          │         │                          │
│  lib/brand-brain.ts ◀────┼─── GET  /api/v1/w/:slug/brain      │
│  lib/brief.ts            │         │  /personas, /hooks,      │
│  lib/router.ts           │         │  /assets                 │
│  (generators: Remotion,  │         │                          │
│   Higgsfield, Canva,…)   │         │                          │
│  lib/branding.ts (ffmpeg)│         │                          │
│  lib/qc.ts               │         │                          │
│  lib/push.ts ────────────┼─── POST /api/v1/ingest/...         │
│                          │         │      → IN_REVIEW         │
│  logs/creative-runs.jsonl│         │                          │
│  pending-pushes.jsonl    │         │                          │
└──────────────────────────┘         └──────────────────────────┘
```

## Module responsibilities

| Module                  | Responsibility                                          |
|-------------------------|---------------------------------------------------------|
| `lib/config.ts`         | Env-driven config; per-workspace API key resolution     |
| `lib/pulse-api.ts`      | Typed HTTP client (undici) with timeouts                |
| `lib/brand-brain.ts`    | Brand Brain fetcher with 30-min TTL cache               |
| `lib/brief.ts`          | Builds the generation Brief from Brain + user request   |
| `lib/router.ts`         | Picks the cheapest tool that can produce the format     |
| `lib/qc.ts`             | Pre-push QC: ratio, duration, claims, logo, hook, subs  |
| `lib/branding.ts`       | FFmpeg overlay of workspace logo per platform position  |
| `lib/upload.ts`         | POST `/ingest/creative-uploads` (multipart)             |
| `lib/push.ts`           | Push with idempotency, retry backoff, pending queue     |
| `lib/concepts.ts`       | Deterministic 3-concept proposer (chat can override)    |
| `lib/caption.ts`        | Per-platform caption / hashtag / first-comment builder  |
| `lib/generate.ts`       | Dispatches a ModelChoice to the right adapter           |
| `lib/pipeline.ts`       | End-to-end orchestrator (brief → push)                  |
| `lib/spend.ts`          | Budget guard; blocks premium models past threshold      |
| `lib/logger.ts`         | Append-only JSONL of every creative run                 |
| `adapters/stub.ts`      | Hand-rolled PNG generator for tests / dry runs          |
| `adapters/remotion.ts`  | Invokes `npx remotion render` per workspace             |
| `adapters/external.ts`  | Emits render-request JSON for MCP-driven adapters       |
| `data/model-catalog.ts` | Source of truth for model names, costs, ratios          |

## Testing

```bash
pnpm --filter @pulse/studio test
```

The suite covers the model router, QC engine, brief builder, and spend guard.
Generator integrations (Remotion / Higgsfield / Canva / ElevenLabs / Pletor)
are *not* exercised in CI — they require local toolchains and external auth.

## What this package does NOT do

- Generate content autonomously without user approval of the concept
- Publish to social networks (that's Pulse's `publish` job runner)
- Schedule posts (the studio only sends `suggested_schedule`; the user confirms)
- Touch tokens or any data scoped to other workspaces
