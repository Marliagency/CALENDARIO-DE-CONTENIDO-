import { prisma } from "../db.js";
import { simulateAdapter } from "../adapters/simulate.js";
import {
  publishVideo,
  publishImage,
  getProfileForWorkspace,
  mapPlatformName,
} from "../adapters/upload-post.js";
import type { JobPayload } from "../lib/jobs.js";
import { notifyPublishFailed } from "../lib/notifications.js";
import { parseJSON } from "../lib/json.js";

/**
 * Handler del job "publish".
 *
 * Flujo:
 *  1. Si PULSE_SIMULATE_PUBLISH=1 → usa simulateAdapter (publish sincrono).
 *  2. Si no → encola en Upload-Post (asincrono). Guarda uploadPostId en
 *     el PublishJob asociado y deja la variant en "publishing".
 *     El upload-status-poller leera el estado real y la marcara como
 *     "published" o "failed".
 */
export async function publishHandler(payload: JobPayload["publish"]) {
  const variant = await prisma.platformVariant.findUnique({
    where: { id: payload.platformVariantId },
    include: { socialAccount: true, contentPiece: true },
  });
  if (!variant) throw new Error(`Variant ${payload.platformVariantId} not found`);
  if (!variant.socialAccount) throw new Error(`Social account missing`);
  if (!variant.mediaUrl) throw new Error(`Variant ${variant.id} has no mediaUrl`);

  await prisma.platformVariant.update({
    where: { id: variant.id },
    data: { status: "publishing" },
  });

  // Recuperar el PublishJob asociado (creado por el scheduler).
  const publishJob = await prisma.publishJob.findFirst({
    where: {
      platformVariantId: variant.id,
      status: { in: ["pending", "running"] },
    },
    orderBy: { createdAt: "desc" },
  });

  try {
    if (process.env.PULSE_SIMULATE_PUBLISH === "1") {
      // Modo simulacion — publicacion sincrona, sin upload-post.
      const idempotencyKey = `${variant.id}:${variant.scheduledAt?.toISOString() ?? "now"}`;
      const result = await simulateAdapter.publish(
        variant.socialAccount,
        variant,
        "sim-token",
        idempotencyKey,
      );
      await prisma.platformVariant.update({
        where: { id: variant.id },
        data: {
          status: "published",
          publishedAt: result.publishedAt,
          platformPostId: result.platformPostId,
        },
      });
      await prisma.socialAccount.update({
        where: { id: variant.socialAccount.id },
        data: { lastPublishedAt: result.publishedAt },
      });
      if (publishJob) {
        await prisma.publishJob.update({
          where: { id: publishJob.id },
          data: { status: "done", executedAt: result.publishedAt },
        });
      }
      return;
    }

    // Modo real → Upload-Post (asincrono).
    const workspace = await prisma.workspace.findUnique({
      where: { id: variant.workspaceId },
    });
    if (!workspace) throw new Error(`Workspace ${variant.workspaceId} not found`);

    const profile = getProfileForWorkspace(workspace.slug);
    const platform = mapPlatformName(variant.platform);
    if (!platform) {
      throw new Error(
        `Plataforma "${variant.platform}" no soportada por Upload-Post`,
      );
    }

    const caption = variant.caption ?? "";
    const isAi = variant.contentPiece.source === "studio";
    const scheduledAt = variant.scheduledAt?.toISOString();
    const mediaType = variant.mediaType ?? inferMediaType(variant.mediaUrl);

    const result = mediaType === "image"
      ? await publishImage({
          profile,
          platforms: [platform],
          imageUrls: parseImageUrls(variant.mediaUrl),
          title: caption,
          scheduledAt,
        })
      : await publishVideo({
          profile,
          platforms: [platform],
          videoUrl: variant.mediaUrl,
          title: caption,
          scheduledAt,
          tiktokIsAiGenerated: platform === "tiktok" ? isAi : undefined,
        });

    if (!result.success || !result.uploadId) {
      throw new Error(result.error ?? "Upload-Post devolvio fallo sin detalle");
    }

    // Guardar uploadId en el PublishJob; la variant se queda en "publishing"
    // hasta que el poller lea el estado final.
    if (publishJob) {
      await prisma.publishJob.update({
        where: { id: publishJob.id },
        data: { status: "running", uploadPostId: result.uploadId },
      });
    }
  } catch (err) {
    await prisma.platformVariant.update({
      where: { id: variant.id },
      data: { status: "failed" },
    });
    if (publishJob) {
      await prisma.publishJob.update({
        where: { id: publishJob.id },
        data: {
          status: "failed",
          lastError: err instanceof Error ? err.message : String(err),
        },
      });
    }
    const ws = await prisma.workspace.findUnique({
      where: { id: variant.workspaceId },
      select: { slug: true },
    });
    if (ws) {
      await notifyPublishFailed(
        variant.workspaceId,
        variant.id,
        variant.contentPiece.title,
        err instanceof Error ? err.message : String(err),
        ws.slug,
      );
    }
    throw err;
  }
}

function inferMediaType(url: string): "image" | "video" {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  return ["mp4", "mov", "webm", "m4v"].includes(ext) ? "video" : "image";
}

function parseImageUrls(mediaUrl: string): string[] {
  // PlatformVariant.mediaUrl es un solo string. Si el contenido es carrusel,
  // el campo guarda un JSON-encoded array como convencion.
  if (mediaUrl.trim().startsWith("[")) {
    const parsed = parseJSON<unknown>(mediaUrl, null);
    if (Array.isArray(parsed) && parsed.every((u) => typeof u === "string")) {
      return parsed as string[];
    }
  }
  return [mediaUrl];
}
