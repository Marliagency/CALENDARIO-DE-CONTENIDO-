import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { encrypt } from "../lib/crypto.js";

/**
 * OAuth routes.
 *
 * En esta fase, los endpoints reales contra Meta/TikTok/Google estan como
 * stub. Existe un endpoint `dev-connect` que genera una cuenta social con
 * tokens cifrados mock, util para probar el flujo end-to-end sin App Review.
 *
 * El endpoint `update-token` permite actualizar manualmente el token de una
 * cuenta existente — util cuando el token se obtiene fuera del flujo OAuth
 * (p.ej. desde la herramienta de Graph Explorer de Meta o desde el panel
 * de desarrolladores de LinkedIn).
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

  /**
   * GET /api/v1/oauth/:platform/start?workspace=qyro
   * Devuelve la URL OAuth a la que abrir el pop-up.
   * Por ahora es un placeholder — la URL real se construye cuando META_APP_ID,
   * TIKTOK_CLIENT_KEY etc. esten configurados.
   */
  app.get<{ Params: { platform: string }; Querystring: { workspace: string } }>(
    "/:platform/start",
    async (req, reply) => {
      const platform = req.params.platform;
      const ws = req.query.workspace;
      if (!VALID_PLATFORMS.includes(platform)) {
        return reply.status(400).send({ error: "Unknown platform" });
      }

      const state = crypto.randomBytes(16).toString("hex");
      // En implementacion real: guardar state en BD con TTL 10min,
      // y comparar en el callback.

      const urls: Record<string, () => string | null> = {
        instagram: () => {
          if (!process.env.META_APP_ID) return null;
          const scope = "instagram_basic,instagram_content_publish,pages_show_list";
          return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${process.env.META_APP_ID}&redirect_uri=${encodeURIComponent(process.env.META_OAUTH_REDIRECT ?? "")}&scope=${scope}&state=${state}`;
        },
        tiktok: () => {
          if (!process.env.TIKTOK_CLIENT_KEY) return null;
          return `https://www.tiktok.com/v2/auth/authorize?client_key=${process.env.TIKTOK_CLIENT_KEY}&scope=user.info.basic,video.upload,video.publish&response_type=code&redirect_uri=${encodeURIComponent(process.env.TIKTOK_OAUTH_REDIRECT ?? "")}&state=${state}`;
        },
        youtube: () => {
          if (!process.env.GOOGLE_CLIENT_ID) return null;
          const scope = "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube";
          return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.GOOGLE_OAUTH_REDIRECT ?? "")}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${state}`;
        },
        linkedin: () => {
          if (!process.env.LINKEDIN_CLIENT_ID) return null;
          const scope = "openid profile w_member_social";
          return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.LINKEDIN_OAUTH_REDIRECT ?? "")}&scope=${encodeURIComponent(scope)}&state=${state}`;
        },
        twitter_x: () => {
          if (!process.env.TWITTER_CLIENT_ID) return null;
          const scope = "tweet.read tweet.write users.read offline.access";
          // PKCE challenge — in a real flow this would be generated per-request
          // and stored server-side; here we use a fixed verifier for simplicity.
          const challenge = process.env.TWITTER_CODE_CHALLENGE ?? "challenge";
          return `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${process.env.TWITTER_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.TWITTER_OAUTH_REDIRECT ?? "")}&scope=${encodeURIComponent(scope)}&state=${state}&code_challenge=${challenge}&code_challenge_method=plain`;
        },
      };

      const url = urls[platform]?.();
      if (!url) {
        return {
          configured: false,
          message: `Las credenciales de ${platform} no estan configuradas en .env.local. Usa /api/v1/oauth/dev-connect para crear una cuenta mock.`,
          state,
        };
      }
      return { configured: true, url, state, workspace: ws };
    },
  );

  /**
   * Callbacks — placeholders. Implementacion real en Fase 5 una vez aprobado
   * el App Review de cada plataforma.
   */
  app.get<{ Params: { platform: string } }>("/:platform/callback", async (req, reply) => {
    return reply.status(501).send({
      error: "OAuth callback not implemented yet",
      platform: req.params.platform,
      hint: "Usa /api/v1/oauth/dev-connect en development para crear cuentas de prueba.",
    });
  });
}
