import { prisma } from "../db.js";
import { getUploadStatus, mapPlatformName } from "../adapters/upload-post.js";
import { notifyPublishFailed } from "../lib/notifications.js";

/**
 * Poller que verifica el estado de los uploads en Upload-Post.
 *
 * Corre cada N segundos (configurado en runner.ts). Coge los PublishJobs
 * con status="running" y uploadPostId no nulo, consulta el estado en
 * Upload-Post y propaga el resultado a PlatformVariant + PublishJob.
 */
export async function pollUploadStatuses(): Promise<void> {
  if (process.env.PULSE_SIMULATE_PUBLISH === "1") return; // simulate publica sincrono
  if (!process.env.UPLOAD_POST_API_KEY) return; // no configurado

  // Solo jobs creados en las ultimas 24h para no hacer polling infinito.
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const jobs = await prisma.publishJob.findMany({
    where: {
      status: "running",
      uploadPostId: { not: null },
      createdAt: { gte: cutoff },
    },
    include: { platformVariant: { include: { contentPiece: true } } },
  });

  for (const job of jobs) {
    if (!job.uploadPostId) continue;

    let status;
    try {
      status = await getUploadStatus(job.uploadPostId);
    } catch (err) {
      // Error transitorio de red — reintentar en el siguiente tick.
      console.warn(`[upload-poll] ${job.uploadPostId}:`, err instanceof Error ? err.message : err);
      continue;
    }

    const platformKey = mapPlatformName(job.platformVariant.platform);
    const platformResult = platformKey ? status.platforms?.[platformKey] : undefined;

    if (status.status === "published" || platformResult?.status === "published") {
      const publishedAt = new Date();
      await prisma.platformVariant.update({
        where: { id: job.platformVariantId },
        data: {
          status: "published",
          publishedAt,
          platformPostId: platformResult?.postId ?? null,
        },
      });
      await prisma.socialAccount.update({
        where: { id: job.socialAccountId },
        data: { lastPublishedAt: publishedAt },
      });
      await prisma.publishJob.update({
        where: { id: job.id },
        data: { status: "done", executedAt: publishedAt },
      });
      continue;
    }

    if (status.status === "failed" || platformResult?.status === "failed") {
      const errorMsg = platformResult?.error ?? "Upload-Post reporto fallo en la publicacion";
      await prisma.platformVariant.update({
        where: { id: job.platformVariantId },
        data: { status: "failed" },
      });
      await prisma.publishJob.update({
        where: { id: job.id },
        data: { status: "failed", lastError: errorMsg, executedAt: new Date() },
      });
      const ws = await prisma.workspace.findUnique({
        where: { id: job.workspaceId },
        select: { slug: true },
      });
      if (ws) {
        await notifyPublishFailed(
          job.workspaceId,
          job.platformVariantId,
          job.platformVariant.contentPiece.title,
          errorMsg,
          ws.slug,
        );
      }
      continue;
    }

    // pending / processing → seguir esperando en el proximo tick.
  }
}
