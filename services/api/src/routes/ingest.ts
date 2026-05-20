import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../db.js";
import { stringifyJSON } from "../lib/json.js";

const variantSchema = z.object({
  social_account_nickname: z.string().optional(),
  social_account_id: z.string().optional(),
  media_url: z.string().url(),
  ratio: z.string().optional(),
  duration_s: z.number().int().optional(),
  caption: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
});

const ingestSchema = z.object({
  external_ref: z.string().uuid(),
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

export async function ingestRoutes(app: FastifyInstance) {
  app.post("/content-pieces", async (req, reply) => {
    // Auth: Bearer sk_ws_xxx
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Missing API key" });
    }
    const token = auth.slice(7);
    const prefix = token.slice(0, 11); // sk_ws_xxxxxxxx
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const apiKey = await prisma.workspaceApiKey.findFirst({
      where: { keyPrefix: prefix, keyHash: hash },
    });
    if (!apiKey) return reply.status(401).send({ error: "Invalid API key" });

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
      return reply.status(200).send({
        content_piece_id: existing.id,
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
        workspaceId: apiKey.workspaceId,
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
    for (const [platform, v] of Object.entries(body.platform_variants)) {
      // Resolver cuenta por nickname si viene
      let socialAccountId = v.social_account_id;
      if (!socialAccountId && v.social_account_nickname) {
        const acc = await prisma.socialAccount.findFirst({
          where: {
            workspaceId: apiKey.workspaceId,
            nickname: v.social_account_nickname,
          },
        });
        if (acc) socialAccountId = acc.id;
      }
      if (!socialAccountId) continue;

      const scheduledAt = body.suggested_schedule?.[platform];
      const variant = await prisma.platformVariant.create({
        data: {
          contentPieceId: piece.id,
          workspaceId: apiKey.workspaceId,
          socialAccountId,
          platform: platform.startsWith("instagram") ? "instagram" : platform,
          mediaUrl: v.media_url,
          ratio: v.ratio,
          durationS: v.duration_s,
          caption: v.caption,
          hashtags: stringifyJSON(v.hashtags ?? []),
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          boostBudgetEur: body.suggested_boost_budget_eur ?? 0,
        },
      });
      variants.push({ id: variant.id, platform: variant.platform, status: variant.status });
    }

    await prisma.workspaceApiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return reply.status(201).send({
      content_piece_id: piece.id,
      status: piece.status,
      platform_variants: variants,
    });
  });
}
