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
pnpm --filter @pulse/studio studio doctor
pnpm --filter @pulse/studio studio brain --slug qyro
pnpm --filter @pulse/studio studio spend
pnpm --filter @pulse/studio studio replay   # retries pushes saved on disk
```

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

| Module              | Responsibility                                          |
|---------------------|---------------------------------------------------------|
| `lib/config.ts`     | Env-driven config; per-workspace API key resolution     |
| `lib/pulse-api.ts`  | Typed HTTP client (undici) with timeouts                |
| `lib/brand-brain.ts`| Brand Brain fetcher with 30-min TTL cache               |
| `lib/brief.ts`      | Builds the generation Brief from Brain + user request   |
| `lib/router.ts`     | Picks the cheapest tool that can produce the format     |
| `lib/qc.ts`         | Pre-push QC: ratio, duration, claims, logo, hook, subs  |
| `lib/branding.ts`   | FFmpeg overlay of workspace logo per platform position  |
| `lib/push.ts`       | Push with idempotency, retry backoff, pending queue     |
| `lib/spend.ts`      | Budget guard; blocks premium models past threshold      |
| `lib/logger.ts`     | Append-only JSONL of every creative run                 |

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
