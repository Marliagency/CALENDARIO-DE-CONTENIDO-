import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { parseJSON } from "../lib/json.js";
import { workspaceScope } from "../lib/workspace-scope.js";

const FORMAT_VALUES = [
  "image",
  "carousel",
  "reel",
  "ugc_video",
  "app_demo",
  "lifestyle_ad",
  "short",
  "post",
] as const;

const STATUS_VALUES = ["draft", "in_review", "approved", "rejected", "scheduled", "published"] as const;

function serializePiece(p: {
  [key: string]: unknown;
  targetAccounts: string;
  qcResults: string;
  variants?: Array<{
    [key: string]: unknown;
    hashtags: string;
    boostPlatforms: string;
  }>;
}) {
  const result: Record<string, unknown> = {
    ...p,
    targetAccounts: parseJSON(p.targetAccounts, []),
    qcResults: parseJSON(p.qcResults, []),
  };
  if (p.variants) {
    result.variants = p.variants.map((v) => ({
      ...v,
      hashtags: parseJSON(v.hashtags, []),
      boostPlatforms: parseJSON(v.boostPlatforms, []),
    }));
  }
  return result;
}

export async function contentRoutes(app: FastifyInstance) {
  app.addHook("preHandler", workspaceScope);

  app.get<{ Params: { slug: string }; Querystring: { status?: string } }>(
    "/pieces",
    async (req) => {
      const where: { workspaceId: string; status?: string } = {
        workspaceId: req.workspaceId!,
      };
      if (req.query.status) where.status = req.query.status;
      const pieces = await prisma.contentPiece.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { variants: true },
      });
      return pieces.map((p) => serializePiece(p));
    },
  );

  app.get<{ Params: { slug: string; id: string } }>("/pieces/:id", async (req, reply) => {
    const piece = await prisma.contentPiece.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId! },
      include: { variants: true },
    });
    if (!piece) return reply.status(404).send({ error: "Not found" });
    return serializePiece(piece);
  });

  const createPieceSchema = z.object({
    title: z.string().min(1).max(200),
    format: z.enum(FORMAT_VALUES),
    targetAccounts: z.array(z.string()).default([]),
    buyerPersonaId: z.string().optional(),
    campaignId: z.string().optional(),
    frameworkUsed: z.string().optional(),
    hookUsed: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(["draft", "in_review"]).default("draft"),
  });

  app.post<{ Params: { slug: string } }>("/pieces", async (req, reply) => {
    const body = createPieceSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const piece = await prisma.contentPiece.create({
      data: {
        workspaceId: req.workspaceId!,
        source: "manual",
        createdById: req.user?.id ?? null,
        title: body.data.title,
        format: body.data.format,
        targetAccounts: JSON.stringify(body.data.targetAccounts),
        buyerPersonaId: body.data.buyerPersonaId,
        campaignId: body.data.campaignId,
        frameworkUsed: body.data.frameworkUsed,
        hookUsed: body.data.hookUsed,
        notes: body.data.notes,
        status: body.data.status,
      },
      include: { variants: true },
    });

    await prisma.auditLog.create({
      data: {
        workspaceId: req.workspaceId!,
        entityType: "ContentPiece",
        entityId: piece.id,
        action: "create",
        actorId: req.user?.id ?? null,
      },
    });

    return reply.status(201).send(serializePiece(piece));
  });

  const patchPieceSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    format: z.enum(FORMAT_VALUES).optional(),
    targetAccounts: z.array(z.string()).optional(),
    buyerPersonaId: z.string().optional(),
    campaignId: z.string().optional(),
    frameworkUsed: z.string().optional(),
    hookUsed: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(STATUS_VALUES).optional(),
  });

  app.patch<{ Params: { slug: string; id: string } }>("/pieces/:id", async (req, reply) => {
    const body = patchPieceSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const existing = await prisma.contentPiece.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId! },
    });
    if (!existing) return reply.status(404).send({ error: "Not found" });

    const update: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body.data)) {
      if (v === undefined) continue;
      if (k === "targetAccounts") {
        update[k] = JSON.stringify(v);
      } else {
        update[k] = v;
      }
    }

    const updated = await prisma.contentPiece.update({
      where: { id: existing.id },
      data: update,
      include: { variants: true },
    });

    await prisma.auditLog.create({
      data: {
        workspaceId: req.workspaceId!,
        entityType: "ContentPiece",
        entityId: existing.id,
        action: "update",
        actorId: req.user?.id ?? null,
        notes: Object.keys(body.data).join(", "),
      },
    });

    return serializePiece(updated);
  });

  app.delete<{ Params: { slug: string; id: string } }>("/pieces/:id", async (req, reply) => {
    const existing = await prisma.contentPiece.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId! },
    });
    if (!existing) return reply.status(404).send({ error: "Not found" });

    await prisma.contentPiece.delete({ where: { id: existing.id } });

    await prisma.auditLog.create({
      data: {
        workspaceId: req.workspaceId!,
        entityType: "ContentPiece",
        entityId: existing.id,
        action: "delete",
        actorId: req.user?.id ?? null,
      },
    });

    return reply.status(204).send();
  });

  const createVariantSchema = z.object({
    socialAccountId: z.string(),
    platform: z.string(),
    caption: z.string().optional(),
    hashtags: z.array(z.string()).default([]),
    mediaUrl: z.string().url().optional(),
    mediaType: z.string().optional(),
    scheduledAt: z.string().datetime().optional(),
  });

  app.post<{ Params: { slug: string; id: string } }>("/pieces/:id/variants", async (req, reply) => {
    const body = createVariantSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const piece = await prisma.contentPiece.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId! },
    });
    if (!piece) return reply.status(404).send({ error: "Content piece not found" });

    const socialAccount = await prisma.socialAccount.findFirst({
      where: { id: body.data.socialAccountId, workspaceId: req.workspaceId! },
    });
    if (!socialAccount) return reply.status(404).send({ error: "Social account not found" });

    const variant = await prisma.platformVariant.create({
      data: {
        contentPieceId: piece.id,
        workspaceId: req.workspaceId!,
        socialAccountId: body.data.socialAccountId,
        platform: body.data.platform,
        caption: body.data.caption,
        hashtags: JSON.stringify(body.data.hashtags),
        mediaUrl: body.data.mediaUrl,
        mediaType: body.data.mediaType,
        scheduledAt: body.data.scheduledAt ? new Date(body.data.scheduledAt) : null,
        status: "draft",
      },
    });

    return reply.status(201).send({
      ...variant,
      hashtags: parseJSON(variant.hashtags, []),
      boostPlatforms: parseJSON(variant.boostPlatforms, []),
    });
  });
}
