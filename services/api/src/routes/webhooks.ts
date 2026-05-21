import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { prisma } from "../db.js";
import { hmacVerify } from "../lib/crypto.js";

type MetaEntry = {
  id?: string;
  time?: number;
  changes?: Array<{
    field: string;
    value: Record<string, unknown>;
  }>;
  messaging?: Array<Record<string, unknown>>;
};

type MetaPayload = {
  object?: string;
  entry?: MetaEntry[];
};

async function dispatchMetaEvent(
  app: FastifyInstance,
  payload: MetaPayload,
): Promise<{ handled: number; skipped: number }> {
  let handled = 0;
  let skipped = 0;

  for (const entry of payload.entry ?? []) {
    const platformAccountId = entry.id;
    if (!platformAccountId) {
      skipped += 1;
      continue;
    }
    const account = await prisma.socialAccount.findFirst({
      where: {
        OR: [
          { platformIgUserId: platformAccountId },
          { platformPageId: platformAccountId },
          { platformUserId: platformAccountId },
        ],
      },
    });
    if (!account) {
      app.log.warn({ platformAccountId }, "Meta webhook: cuenta social no encontrada");
      skipped += 1;
      continue;
    }

    for (const change of entry.changes ?? []) {
      const value = change.value as Record<string, any>;
      const mediaId = value?.media_id || value?.media?.id || value?.post_id;
      const variant = mediaId
        ? await prisma.platformVariant.findFirst({
            where: { workspaceId: account.workspaceId, platformPostId: String(mediaId) },
          })
        : null;

      switch (change.field) {
        case "comments":
        case "mentions": {
          await prisma.notification.create({
            data: {
              workspaceId: account.workspaceId,
              kind: change.field === "mentions" ? "info" : "info",
              severity: "info",
              title:
                change.field === "mentions"
                  ? `Nueva mencion en ${account.platform}`
                  : `Nuevo comentario en ${account.platform}`,
              body: typeof value?.text === "string" ? value.text.slice(0, 240) : null,
              entityType: variant ? "PlatformVariant" : "SocialAccount",
              entityId: variant?.id ?? account.id,
              url: variant
                ? `/w/${account.workspaceId}/queue/${variant.contentPieceId}`
                : `/w/${account.workspaceId}/accounts`,
            },
          });
          handled += 1;
          break;
        }
        case "live_videos":
        case "feed": {
          if (variant && value?.verb === "remove") {
            await prisma.platformVariant.update({
              where: { id: variant.id },
              data: { status: "removed_by_platform" },
            });
            await prisma.notification.create({
              data: {
                workspaceId: account.workspaceId,
                kind: "publish_failed",
                severity: "warning",
                title: `Post eliminado por ${account.platform}`,
                entityType: "PlatformVariant",
                entityId: variant.id,
                url: `/w/${account.workspaceId}/queue/${variant.contentPieceId}`,
              },
            });
          }
          handled += 1;
          break;
        }
        default:
          app.log.info({ field: change.field }, "Meta webhook: campo sin handler especifico");
          skipped += 1;
      }
    }
  }

  return { handled, skipped };
}

type TikTokPayload = {
  event?: string;
  client_key?: string;
  user_openid?: string;
  content?: Record<string, unknown>;
};

async function dispatchTikTokEvent(
  app: FastifyInstance,
  payload: TikTokPayload,
): Promise<{ handled: number; skipped: number }> {
  const openId = payload.user_openid;
  if (!openId) return { handled: 0, skipped: 1 };

  const account = await prisma.socialAccount.findFirst({
    where: { platform: "tiktok", platformUserId: openId },
  });
  if (!account) {
    app.log.warn({ openId }, "TikTok webhook: cuenta no encontrada");
    return { handled: 0, skipped: 1 };
  }

  switch (payload.event) {
    case "video.publish.complete":
    case "video.publish.failed": {
      const videoId = (payload.content as any)?.video_id;
      const variant = videoId
        ? await prisma.platformVariant.findFirst({
            where: {
              workspaceId: account.workspaceId,
              platformVideoId: String(videoId),
            },
          })
        : null;
      if (variant) {
        await prisma.platformVariant.update({
          where: { id: variant.id },
          data: {
            status: payload.event === "video.publish.complete" ? "published" : "failed",
            publishedAt: payload.event === "video.publish.complete" ? new Date() : variant.publishedAt,
          },
        });
        await prisma.notification.create({
          data: {
            workspaceId: account.workspaceId,
            kind: payload.event === "video.publish.complete" ? "info" : "publish_failed",
            severity: payload.event === "video.publish.complete" ? "info" : "error",
            title:
              payload.event === "video.publish.complete"
                ? "Video publicado en TikTok"
                : "Fallo publicacion en TikTok",
            entityType: "PlatformVariant",
            entityId: variant.id,
            url: `/w/${account.workspaceId}/queue/${variant.contentPieceId}`,
          },
        });
        return { handled: 1, skipped: 0 };
      }
      return { handled: 0, skipped: 1 };
    }
    default:
      app.log.info({ event: payload.event }, "TikTok webhook: evento sin handler");
      return { handled: 0, skipped: 1 };
  }
}

/**
 * Webhooks entrantes de las plataformas.
 *
 * - Meta envía un GET para verificación inicial con hub.challenge.
 * - Posteriores POSTs llevan firma en X-Hub-Signature-256 (sha256=<hex>).
 * - TikTok envía firmas similares en X-TT-Signature.
 *
 * Esta fase solo valida y loguea. El procesamiento real (comments, mentions,
 * delivery confirmations) se añade junto con cada feature.
 */

export async function webhookRoutes(app: FastifyInstance) {
  // ---------- Meta (Instagram + Facebook) ----------
  app.get<{
    Querystring: {
      "hub.mode": string;
      "hub.verify_token": string;
      "hub.challenge": string;
    };
  }>("/meta", async (req, reply) => {
    const { "hub.mode": mode, "hub.verify_token": token, "hub.challenge": challenge } = req.query;
    const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;
    if (mode === "subscribe" && expected && token === expected) {
      return reply.type("text/plain").send(challenge);
    }
    return reply.status(403).send({ error: "Verify token mismatch" });
  });

  app.post("/meta", async (req, reply) => {
    const signature = req.headers["x-hub-signature-256"];
    if (typeof signature !== "string") {
      return reply.status(400).send({ error: "Missing signature" });
    }
    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) return reply.status(503).send({ error: "App not configured" });

    const raw = JSON.stringify(req.body);
    const sig = signature.replace("sha256=", "");
    const expected = crypto.createHmac("sha256", appSecret).update(raw).digest("hex");
    try {
      const ok = crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
      if (!ok) return reply.status(403).send({ error: "Invalid signature" });
    } catch {
      return reply.status(403).send({ error: "Invalid signature" });
    }

    app.log.info({ payload: req.body }, "Meta webhook received");
    try {
      const stats = await dispatchMetaEvent(app, req.body as MetaPayload);
      return { received: true, ...stats };
    } catch (err) {
      app.log.error({ err }, "Meta webhook dispatch failed");
      return { received: true, handled: 0, skipped: 0, error: "dispatch_failed" };
    }
  });

  // ---------- TikTok ----------
  app.post("/tiktok", async (req, reply) => {
    const signature = req.headers["x-tt-signature"];
    if (typeof signature !== "string") {
      return reply.status(400).send({ error: "Missing signature" });
    }
    const secret = process.env.TIKTOK_CLIENT_SECRET;
    if (!secret) return reply.status(503).send({ error: "App not configured" });

    const raw = JSON.stringify(req.body);
    if (!hmacVerify(raw, secret, signature)) {
      return reply.status(403).send({ error: "Invalid signature" });
    }
    app.log.info({ payload: req.body }, "TikTok webhook received");
    try {
      const stats = await dispatchTikTokEvent(app, req.body as TikTokPayload);
      return { received: true, ...stats };
    } catch (err) {
      app.log.error({ err }, "TikTok webhook dispatch failed");
      return { received: true, handled: 0, skipped: 0, error: "dispatch_failed" };
    }
  });
}
