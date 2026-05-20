import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { parseJSON } from "../lib/json.js";
import { workspaceScope } from "../lib/workspace-scope.js";

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
      return pieces.map((p) => ({
        ...p,
        targetAccounts: parseJSON(p.targetAccounts, []),
        qcResults: parseJSON(p.qcResults, []),
        variants: p.variants.map((v) => ({
          ...v,
          hashtags: parseJSON(v.hashtags, []),
          boostPlatforms: parseJSON(v.boostPlatforms, []),
        })),
      }));
    },
  );

  app.get<{ Params: { slug: string; id: string } }>("/pieces/:id", async (req, reply) => {
    const piece = await prisma.contentPiece.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId! },
      include: { variants: true },
    });
    if (!piece) return reply.status(404).send({ error: "Not found" });
    return piece;
  });
}
