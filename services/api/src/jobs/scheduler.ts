import { prisma } from "../db.js";
import { enqueueJob } from "../lib/jobs.js";

/**
 * Scheduler que se ejecuta cada minuto y encola jobs `publish` para variants
 * que están en estado `scheduled` con scheduledAt <= now y aún no tienen
 * PublishJob asociado.
 */
export async function publishScheduler() {
  const now = new Date();

  const ready = await prisma.platformVariant.findMany({
    where: {
      status: "scheduled",
      scheduledAt: { lte: now },
    },
    include: { publishJobs: true },
  });

  for (const variant of ready) {
    // Si ya tiene un PublishJob pendiente/running, no duplicar.
    if (variant.publishJobs.some((j) => j.status === "pending" || j.status === "running")) {
      continue;
    }

    await prisma.publishJob.create({
      data: {
        platformVariantId: variant.id,
        workspaceId: variant.workspaceId,
        socialAccountId: variant.socialAccountId,
        scheduledAt: variant.scheduledAt,
        idempotencyKey: `${variant.id}:${variant.scheduledAt?.toISOString() ?? "now"}`,
      },
    });

    await enqueueJob("publish", { platformVariantId: variant.id });
  }
}
