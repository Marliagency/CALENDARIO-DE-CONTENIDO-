import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { workspaceScope } from "../lib/workspace-scope.js";

export async function metricsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", workspaceScope);

  app.get<{ Params: { slug: string } }>("/", async (req) => {
    const metrics = await prisma.metric.findMany({
      where: { workspaceId: req.workspaceId! },
      orderBy: { fetchedAt: "desc" },
      take: 200,
    });
    return metrics;
  });
}
