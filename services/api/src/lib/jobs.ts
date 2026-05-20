import { prisma } from "../db.js";
import { parseJSON, stringifyJSON } from "./json.js";

export type JobKind =
  | "publish"
  | "refresh_token"
  | "pull_metrics"
  | "reset_rate_limit";

export interface JobPayload {
  publish: { platformVariantId: string };
  refresh_token: { socialAccountId: string };
  pull_metrics: { workspaceId: string };
  reset_rate_limit: Record<string, never>;
}

export async function enqueueJob<K extends JobKind>(
  kind: K,
  payload: JobPayload[K],
  runAt?: Date,
) {
  return prisma.job.create({
    data: {
      kind,
      payload: stringifyJSON(payload),
      runAt: runAt ?? new Date(),
    },
  });
}

/**
 * Worker loop: cada 5s busca jobs pending con runAt<=now, los procesa secuencialmente.
 * En SQLite no hay SELECT FOR UPDATE SKIP LOCKED, pero como solo hay un worker
 * en development, es suficiente.
 */
export async function tick(handlers: Record<string, (payload: any) => Promise<void>>) {
  const now = new Date();
  const next = await prisma.job.findFirst({
    where: { status: "pending", runAt: { lte: now } },
    orderBy: { runAt: "asc" },
  });
  if (!next) return false;

  await prisma.job.update({
    where: { id: next.id },
    data: { status: "running", startedAt: new Date(), attempt: next.attempt + 1 },
  });

  const handler = handlers[next.kind];
  if (!handler) {
    await prisma.job.update({
      where: { id: next.id },
      data: { status: "failed", finishedAt: new Date(), lastError: `no handler for ${next.kind}` },
    });
    return true;
  }

  try {
    await handler(parseJSON(next.payload, {}));
    await prisma.job.update({
      where: { id: next.id },
      data: { status: "done", finishedAt: new Date() },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const failed = next.attempt + 1 >= next.maxAttempts;
    await prisma.job.update({
      where: { id: next.id },
      data: {
        status: failed ? "failed" : "pending",
        finishedAt: failed ? new Date() : null,
        lastError: msg,
        // Back-off exponencial: 2s, 8s, 32s...
        runAt: failed
          ? next.runAt
          : new Date(Date.now() + 2000 * Math.pow(4, next.attempt)),
      },
    });
  }
  return true;
}
