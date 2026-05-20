import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { encrypt } from "../lib/crypto.js";

/**
 * OAuth routes.
 *
 * En esta fase, los endpoints reales contra Meta/TikTok/Google están como
 * stub. Existe un endpoint `dev-connect` que genera una cuenta social con
 * tokens cifrados mock, útil para probar el flujo end-to-end sin App Review.
 */

const VALID_PLATFORMS = ["instagram", "facebook", "tiktok", "youtube", "linkedin", "pinterest", "twitter_x"];

const devConnectSchema = z.object({
  workspaceSlug: z.string(),
  platform: z.enum(VALID_PLATFORMS as [string, ...string[]]),
  nickname: z.string().min(1),
  handle: z.string().min(1),
  activeFormats: z.array(z.string()).optional(),
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
      },
    });
    return reply.status(201).send({
      id: account.id,
      handle: account.handle,
      platform: account.platform,
      note: "Tokens generados en modo dev — no son válidos contra la plataforma real.",
    });
  });

  /**
   * GET /api/v1/oauth/:platform/start?workspace=qyro
   * Devuelve la URL OAuth a la que abrir el pop-up.
   * Por ahora es un placeholder — la URL real se construye cuando META_APP_ID,
   * TIKTOK_CLIENT_KEY etc. estén configurados.
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
      // En implementación real: guardar state en BD con TTL 10min,
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
      };

      const url = urls[platform]?.();
      if (!url) {
        return {
          configured: false,
          message: `Las credenciales de ${platform} no están configuradas en .env.local. Usa /api/v1/oauth/dev-connect para crear una cuenta mock.`,
          state,
        };
      }
      return { configured: true, url, state, workspace: ws };
    },
  );

  /**
   * Callbacks — placeholders. Implementación real en Fase 5 una vez aprobado
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
