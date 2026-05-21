import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { encrypt } from "../lib/crypto.js";

/**
 * OAuth routes (reducidas).
 *
 * Desde la migracion a Upload-Post, Pulse ya no inicia flujos OAuth propios
 * contra Meta/TikTok/YouTube/LinkedIn/X — esas conexiones se gestionan en
 * app.upload-post.com.
 *
 * Mantenemos dos endpoints utiles:
 *  - POST /dev-connect    crea una SocialAccount con tokens mock (testing)
 *  - POST /update-token   actualiza el token de una SocialAccount manualmente
 *
 * SocialAccount sigue existiendo como referencia entre PlatformVariant y
 * la cuenta destino dentro del perfil de Upload-Post.
 */

const VALID_PLATFORMS = ["instagram", "facebook", "tiktok", "youtube", "linkedin", "pinterest", "twitter_x"];

const devConnectSchema = z.object({
  workspaceSlug: z.string(),
  platform: z.enum(VALID_PLATFORMS as [string, ...string[]]),
  nickname: z.string().min(1),
  handle: z.string().min(1),
  activeFormats: z.array(z.string()).optional(),
  // Identificadores opcionales de plataforma
  platformUserId: z.string().optional(),
  platformIgUserId: z.string().optional(),
  platformPageId: z.string().optional(),
  platformChannelId: z.string().optional(),
});

const updateTokenSchema = z.object({
  workspaceSlug: z.string(),
  accountId: z.string(),
  accessToken: z.string().min(5),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(), // ISO date string
  platformUserId: z.string().optional(),
  platformIgUserId: z.string().optional(),
  platformPageId: z.string().optional(),
  platformChannelId: z.string().optional(),
});

export async function oauthRoutes(app: FastifyInstance) {
  /**
   * POST /api/v1/oauth/dev-connect
   * Crea una SocialAccount con tokens cifrados mock.
   * Solo disponible cuando NODE_ENV !== production.
   */
  app.post("/dev-connect", async (req, reply) => {
    if (process.env.NODE_ENV === "production") {
      return reply.status(403).send({ error: "dev-connect disabled in production" });
    }
    const body = devConnectSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const ws = await prisma.workspace.findUnique({
      where: { slug: body.data.workspaceSlug },
    });
    if (!ws) return reply.status(404).send({ error: "Workspace not found" });

    const fakeAccessToken = `dev_access_${crypto.randomBytes(16).toString("hex")}`;
    const fakeRefreshToken = `dev_refresh_${crypto.randomBytes(16).toString("hex")}`;
    const account = await prisma.socialAccount.create({
      data: {
        workspaceId: ws.id,
        platform: body.data.platform,
        nickname: body.data.nickname,
        handle: body.data.handle,
        accessTokenEncrypted: encrypt(fakeAccessToken),
        refreshTokenEncrypted: encrypt(fakeRefreshToken),
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60d
        activeFormats: JSON.stringify(body.data.activeFormats ?? ["feed_video"]),
        status: "healthy",
        // Identificadores opcionales de plataforma
        platformUserId: body.data.platformUserId ?? null,
        platformIgUserId: body.data.platformIgUserId ?? null,
        platformPageId: body.data.platformPageId ?? null,
        platformChannelId: body.data.platformChannelId ?? null,
      },
    });
    return reply.status(201).send({
      id: account.id,
      handle: account.handle,
      platform: account.platform,
      note: "Tokens generados en modo dev — no son validos contra la plataforma real.",
    });
  });

  /**
   * POST /api/v1/oauth/update-token
   * Actualiza manualmente el token de una SocialAccount existente.
   * Util cuando el token se obtiene fuera del flujo OAuth estandar
   * (Graph Explorer, panel de desarrolladores, etc.).
   */
  app.post("/update-token", async (req, reply) => {
    const body = updateTokenSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const ws = await prisma.workspace.findUnique({
      where: { slug: body.data.workspaceSlug },
    });
    if (!ws) return reply.status(404).send({ error: "Workspace not found" });

    const account = await prisma.socialAccount.findFirst({
      where: { id: body.data.accountId, workspaceId: ws.id },
    });
    if (!account) {
      return reply.status(404).send({
        error: "Cuenta no encontrada en este workspace.",
      });
    }

    const updateData: Record<string, unknown> = {
      accessTokenEncrypted: encrypt(body.data.accessToken),
      status: "healthy",
      lastError: null,
    };

    if (body.data.refreshToken) {
      updateData["refreshTokenEncrypted"] = encrypt(body.data.refreshToken);
    }

    if (body.data.expiresAt) {
      const parsed = new Date(body.data.expiresAt);
      if (!isNaN(parsed.getTime())) {
        updateData["tokenExpiresAt"] = parsed;
      }
    }

    if (body.data.platformUserId !== undefined) {
      updateData["platformUserId"] = body.data.platformUserId;
    }
    if (body.data.platformIgUserId !== undefined) {
      updateData["platformIgUserId"] = body.data.platformIgUserId;
    }
    if (body.data.platformPageId !== undefined) {
      updateData["platformPageId"] = body.data.platformPageId;
    }
    if (body.data.platformChannelId !== undefined) {
      updateData["platformChannelId"] = body.data.platformChannelId;
    }

    await prisma.socialAccount.update({
      where: { id: account.id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        workspaceId: ws.id,
        entityType: "SocialAccount",
        entityId: account.id,
        action: "token_update",
        notes: `${account.platform} · ${account.handle}`,
      },
    });

    return reply.send({ ok: true });
  });
}
