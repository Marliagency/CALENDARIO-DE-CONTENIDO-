import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { runQc } from "../lib/qc-engine.js";
import { stringifyJSON } from "../lib/json.js";
import { workspaceScope } from "../lib/workspace-scope.js";

export async function queueRoutes(app: FastifyInstance) {
  app.addHook("preHandler", workspaceScope);

  // ---------- QC run ----------
  app.post<{ Params: { slug: string; id: string } }>(
    "/pieces/:id/qc",
    async (req, reply) => {
      const piece = await prisma.contentPiece.findFirst({
        where: { id: req.params.id, workspaceId: req.workspaceId! },
        include: { variants: true },
      });
      if (!piece) return reply.status(404).send({ error: "Not found" });

      const results = await runQc(piece, piece.variants);
      await prisma.contentPiece.update({
        where: { id: piece.id },
        data: { qcResults: stringifyJSON(results) },
      });
      return { results };
    },
  );

  // ---------- Aprobar ----------
  app.post<{ Params: { slug: string; id: string } }>(
    "/pieces/:id/approve",
    async (req, reply) => {
      const piece = await prisma.contentPiece.findFirst({
        where: { id: req.params.id, workspaceId: req.workspaceId! },
        include: { variants: true },
      });
      if (!piece) return reply.status(404).send({ error: "Not found" });

      const updated = await prisma.contentPiece.update({
        where: { id: piece.id },
        data: { status: "approved" },
      });

      // Si todas las variantes tienen scheduledAt, marcar piece como scheduled
      // y poner las variantes en estado scheduled.
      const allScheduled = piece.variants.every((v) => v.scheduledAt != null);
      if (allScheduled && piece.variants.length > 0) {
        await prisma.contentPiece.update({
          where: { id: piece.id },
          data: { status: "scheduled" },
        });
        await prisma.platformVariant.updateMany({
          where: { contentPieceId: piece.id },
          data: { status: "scheduled" },
        });
      }

      await prisma.auditLog.create({
        data: {
          workspaceId: req.workspaceId!,
          entityType: "ContentPiece",
          entityId: piece.id,
          action: "approve",
          fromValue: piece.status,
          toValue: updated.status,
        },
      });
      return updated;
    },
  );

  // ---------- Pedir cambios ----------
  const changesSchema = z.object({ reason: z.string().min(1) });
  app.post<{ Params: { slug: string; id: string } }>(
    "/pieces/:id/request-changes",
    async (req, reply) => {
      const body = changesSchema.safeParse(req.body);
      if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

      const piece = await prisma.contentPiece.findFirst({
        where: { id: req.params.id, workspaceId: req.workspaceId! },
      });
      if (!piece) return reply.status(404).send({ error: "Not found" });

      const updated = await prisma.contentPiece.update({
        where: { id: piece.id },
        data: { status: "changes_requested", notes: body.data.reason },
      });
      await prisma.auditLog.create({
        data: {
          workspaceId: req.workspaceId!,
          entityType: "ContentPiece",
          entityId: piece.id,
          action: "request_changes",
          notes: body.data.reason,
        },
      });
      return updated;
    },
  );

  // ---------- Rechazar ----------
  app.post<{ Params: { slug: string; id: string } }>(
    "/pieces/:id/reject",
    async (req, reply) => {
      const body = changesSchema.safeParse(req.body ?? {});
      const piece = await prisma.contentPiece.findFirst({
        where: { id: req.params.id, workspaceId: req.workspaceId! },
      });
      if (!piece) return reply.status(404).send({ error: "Not found" });
      const updated = await prisma.contentPiece.update({
        where: { id: piece.id },
        data: { status: "rejected", notes: body.success ? body.data.reason : null },
      });
      await prisma.auditLog.create({
        data: {
          workspaceId: req.workspaceId!,
          entityType: "ContentPiece",
          entityId: piece.id,
          action: "reject",
          notes: body.success ? body.data.reason : null,
        },
      });
      return updated;
    },
  );

  // ---------- Schedule por variante ----------
  const scheduleSchema = z.object({
    scheduledAt: z.string().datetime(),
  });
  app.patch<{ Params: { slug: string; variantId: string } }>(
    "/variants/:variantId/schedule",
    async (req, reply) => {
      const body = scheduleSchema.safeParse(req.body);
      if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
      const variant = await prisma.platformVariant.findFirst({
        where: { id: req.params.variantId, workspaceId: req.workspaceId! },
      });
      if (!variant) return reply.status(404).send({ error: "Not found" });
      return prisma.platformVariant.update({
        where: { id: variant.id },
        data: { scheduledAt: new Date(body.data.scheduledAt) },
      });
    },
  );

  // ---------- Boost por variante ----------
  const boostSchema = z.object({
    enabled: z.boolean(),
    budgetEur: z.number().min(0),
    durationDays: z.number().int().min(1).max(90),
    objective: z.string().optional(),
    audiencePresetId: z.string().optional(),
    platforms: z.array(z.string()).optional(),
  });
  app.patch<{ Params: { slug: string; variantId: string } }>(
    "/variants/:variantId/boost",
    async (req, reply) => {
      const body = boostSchema.safeParse(req.body);
      if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
      const variant = await prisma.platformVariant.findFirst({
        where: { id: req.params.variantId, workspaceId: req.workspaceId! },
      });
      if (!variant) return reply.status(404).send({ error: "Not found" });

      const daily = body.data.durationDays > 0
        ? body.data.budgetEur / body.data.durationDays
        : 0;

      return prisma.platformVariant.update({
        where: { id: variant.id },
        data: {
          boostEnabled: body.data.enabled,
          boostBudgetEur: body.data.budgetEur,
          boostDurationDays: body.data.durationDays,
          boostDailyBudgetEur: daily,
          boostObjective: body.data.objective ?? variant.boostObjective,
          boostAudiencePresetId: body.data.audiencePresetId ?? variant.boostAudiencePresetId,
          boostPlatforms: body.data.platforms
            ? JSON.stringify(body.data.platforms)
            : variant.boostPlatforms,
        },
      });
    },
  );
}
