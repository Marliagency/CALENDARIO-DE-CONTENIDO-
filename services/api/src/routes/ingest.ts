import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { stringifyJSON } from "../lib/json.js";
import { requireApiKey } from "../lib/api-key-auth.js";
import { notifyPieceInReview } from "../lib/notifications.js";
import { storage } from "../lib/storage.js";

const variantSchema = z.object({
  social_account_nickname: z.string().optional(),
  social_account_id: z.string().optional(),
  media_url: z.string().url(),
  ratio: z.string().optional(),
  duration_s: z.number().int().optional(),
  caption: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  first_comment: z.string().optional(),
  cta_text: z.string().optional(),
  cta_url: z.string().url().optional(),
});

const ingestSchema = z.object({
  external_ref: z.string().uuid().or(z.string().min(8)),
  title: z.string().min(1),
  format: z.string(),
  buyer_persona_id: z.string().optional(),
  framework_used: z.string().optional(),
  hook_used: z.string().optional(),
  creative_run_metadata: z.record(z.unknown()).optional(),
  platform_variants: z.record(variantSchema),
  suggested_schedule: z.record(z.string()).optional(),
  suggested_boost_budget_eur: z.number().nonnegative().optional(),
});

const PLATFORM_KEYS: Record<string, string> = {
  instagram: "instagram",
  instagram_reel: "instagram",
  instagram_feed: "instagram",
  instagram_story: "instagram",
  tiktok: "tiktok",
  facebook: "facebook",
  facebook_reel: "facebook",
  youtube: "youtube",
  youtube_short: "youtube",
  linkedin: "linkedin",
  pinterest: "pinterest",
  twitter_x: "twitter_x",
};

export async function ingestRoutes(app: FastifyInstance) {
  app.post(
    "/content-pieces",
    {
      preHandler: requireApiKey("ingest"),
      // Bucket más estricto: 60/min por API key. Una pieza con N variants
      // consume 1 request. SESIÓN 2 nunca debería superar esto.
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 minute",
          keyGenerator: (req: any) => {
            const auth = req.headers.authorization;
            return auth?.startsWith("Bearer ") ? `apikey:${auth.slice(7, 22)}` : req.ip;
          },
        },
      },
    },
    async (req, reply) => {
      const workspaceId = req.apiKey!.workspaceId;

      const parsed = ingestSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }
      const body = parsed.data;

      // Idempotency on external_ref
      const existing = await prisma.contentPiece.findUnique({
        where: { externalRef: body.external_ref },
        include: { variants: true },
      });
      if (existing) {
        if (existing.workspaceId !== workspaceId) {
          return reply.status(409).send({
            error: "external_ref already exists in another workspace",
          });
        }
        return reply.status(200).send({
          content_piece_id: existing.id,
          workspace_id: existing.workspaceId,
          status: existing.status,
          platform_variants: existing.variants.map((v) => ({
            id: v.id,
            platform: v.platform,
            status: v.status,
          })),
          idempotent: true,
        });
      }

      const piece = await prisma.contentPiece.create({
        data: {
          workspaceId,
          externalRef: body.external_ref,
          title: body.title,
          format: body.format,
          buyerPersonaId: body.buyer_persona_id,
          frameworkUsed: body.framework_used,
          hookUsed: body.hook_used,
          status: "in_review",
          source: "studio",
          targetAccounts: stringifyJSON([]),
        },
      });

      const variants: { id: string; platform: string; status: string }[] = [];
      for (const [platformKey, v] of Object.entries(body.platform_variants)) {
        const canonicalPlatform =
          PLATFORM_KEYS[platformKey.toLowerCase()] ?? platformKey;

        let socialAccountId = v.social_account_id;
        if (!socialAccountId && v.social_account_nickname) {
          const acc = await prisma.socialAccount.findFirst({
            where: {
              workspaceId,
              nickname: v.social_account_nickname,
            },
          });
          if (acc) socialAccountId = acc.id;
        }
        if (!socialAccountId) {
          // Si no se especifica cuenta, usar la primera de la plataforma.
          const fallback = await prisma.socialAccount.findFirst({
            where: { workspaceId, platform: canonicalPlatform },
          });
          if (fallback) socialAccountId = fallback.id;
        }
        if (!socialAccountId) continue;

        const scheduledAt = body.suggested_schedule?.[platformKey];
        const variant = await prisma.platformVariant.create({
          data: {
            contentPieceId: piece.id,
            workspaceId,
            socialAccountId,
            platform: canonicalPlatform,
            mediaUrl: v.media_url,
            ratio: v.ratio,
            durationS: v.duration_s,
            caption: v.caption,
            hashtags: stringifyJSON(v.hashtags ?? []),
            firstComment: v.first_comment,
            ctaText: v.cta_text,
            ctaUrl: v.cta_url,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
            boostBudgetEur: body.suggested_boost_budget_eur ?? 0,
          },
        });
        variants.push({
          id: variant.id,
          platform: variant.platform,
          status: variant.status,
        });
      }

      // Notificar a miembros del workspace que llegó una pieza nueva.
      const ws = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { slug: true },
      });
      if (ws) {
        await notifyPieceInReview(workspaceId, piece.id, piece.title, ws.slug);
      }

      return reply.status(201).send({
        content_piece_id: piece.id,
        workspace_id: workspaceId,
        status: piece.status,
        platform_variants: variants,
      });
    },
  );

  // ---------------------------------------------------------------
  // POST /api/v1/ingest/creative-uploads
  //
  // Studio (Session 2) uploads a rendered creative file and gets back a
  // signed URL it can drop into platform_variants[].media_url. Unlike
  // /w/:slug/uploads this does NOT create a BrandAsset — these are
  // ephemeral creatives, not brand-library entries.
  // ---------------------------------------------------------------
  app.post(
    "/creative-uploads",
    {
      preHandler: requireApiKey("ingest"),
      config: {
        rateLimit: {
          max: 120,
          timeWindow: "1 minute",
          keyGenerator: (req: any) => {
            const auth = req.headers.authorization;
            return auth?.startsWith("Bearer ") ? `apikey:${auth.slice(7, 22)}` : req.ip;
          },
        },
      },
    },
    async (req, reply) => {
      const workspaceId = req.apiKey!.workspaceId;
      const parts = req.parts();
      let fileBuf: Buffer | null = null;
      let originalFilename = "creative";
      let fileType: string | undefined;

      for await (const part of parts) {
        if (part.type === "file") {
          if (fileBuf) {
            return reply.status(400).send({ error: "Only one file per upload" });
          }
          fileBuf = await part.toBuffer();
          originalFilename = part.filename ?? "creative";
          fileType = part.mimetype;
        }
      }

      if (!fileBuf) {
        return reply.status(400).send({ error: "Missing file" });
      }

      const { key } = await storage.put({
        workspaceId,
        filename: originalFilename,
        body: fileBuf,
      });

      return reply.status(201).send({
        url: storage.signedUrl(key),
        key,
        size_bytes: fileBuf.byteLength,
        content_type: fileType ?? null,
      });
    },
  );
}
