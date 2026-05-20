import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { parseJSON } from "../lib/json.js";
import { workspaceScope } from "../lib/workspace-scope.js";

const updateAccountSchema = z.object({
  nickname: z.string().min(1).optional(),
  handle: z.string().min(1).optional(),
  activeFormats: z.array(z.string()).optional(),
  isAdsEnabled: z.boolean().optional(),
  status: z.enum(["healthy", "warning", "expired", "disabled"]).optional(),
});

export async function socialRoutes(app: FastifyInstance) {
  app.addHook("preHandler", workspaceScope);

  app.get<{ Params: { slug: string } }>("/accounts", async (req) => {
    const accounts = await prisma.socialAccount.findMany({
      where: { workspaceId: req.workspaceId! },
      orderBy: [{ platform: "asc" }, { nickname: "asc" }],
    });
    return accounts.map(
      ({ accessTokenEncrypted: _at, refreshTokenEncrypted: _rt, ...acc }) => ({
        ...acc,
        activeFormats: parseJSON(acc.activeFormats, []),
      }),
    );
  });

  app.patch<{ Params: { slug: string; id: string } }>(
    "/accounts/:id",
    async (req, reply) => {
      const body = updateAccountSchema.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() });
      }
      const existing = await prisma.socialAccount.findFirst({
        where: { id: req.params.id, workspaceId: req.workspaceId! },
      });
      if (!existing) {
        return reply.status(404).send({ error: "Account not found" });
      }
      const updated = await prisma.socialAccount.update({
        where: { id: existing.id },
        data: {
          ...(body.data.nickname !== undefined && { nickname: body.data.nickname }),
          ...(body.data.handle !== undefined && { handle: body.data.handle }),
          ...(body.data.activeFormats !== undefined && {
            activeFormats: JSON.stringify(body.data.activeFormats),
          }),
          ...(body.data.isAdsEnabled !== undefined && {
            isAdsEnabled: body.data.isAdsEnabled,
          }),
          ...(body.data.status !== undefined && { status: body.data.status }),
        },
      });
      await prisma.auditLog.create({
        data: {
          workspaceId: req.workspaceId!,
          entityType: "SocialAccount",
          entityId: updated.id,
          action: "update",
          actorId: req.user?.id ?? null,
          notes: `${updated.platform} · ${updated.handle}`,
        },
      });
      const { accessTokenEncrypted: _at, refreshTokenEncrypted: _rt, ...safe } = updated;
      return { ...safe, activeFormats: parseJSON(safe.activeFormats, []) };
    },
  );

  app.delete<{ Params: { slug: string; id: string } }>(
    "/accounts/:id",
    async (req, reply) => {
      const existing = await prisma.socialAccount.findFirst({
        where: { id: req.params.id, workspaceId: req.workspaceId! },
      });
      if (!existing) {
        return reply.status(404).send({ error: "Account not found" });
      }
      await prisma.socialAccount.delete({ where: { id: existing.id } });
      await prisma.auditLog.create({
        data: {
          workspaceId: req.workspaceId!,
          entityType: "SocialAccount",
          entityId: existing.id,
          action: "delete",
          actorId: req.user?.id ?? null,
          notes: `${existing.platform} · ${existing.handle}`,
        },
      });
      return reply.status(204).send();
    },
  );
}
