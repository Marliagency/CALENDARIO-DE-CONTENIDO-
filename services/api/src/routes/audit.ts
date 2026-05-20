import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { workspaceScope } from "../lib/workspace-scope.js";

export async function auditRoutes(app: FastifyInstance) {
  app.addHook("preHandler", workspaceScope);

  app.get<{
    Params: { slug: string };
    Querystring: { entityType?: string; entityId?: string; limit?: string };
  }>("/", async (req) => {
    const limit = Math.min(parseInt(req.query.limit ?? "100", 10), 500);
    return prisma.auditLog.findMany({
      where: {
        workspaceId: req.workspaceId!,
        ...(req.query.entityType && { entityType: req.query.entityType }),
        ...(req.query.entityId && { entityId: req.query.entityId }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  });
}
