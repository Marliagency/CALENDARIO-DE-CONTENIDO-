import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../db.js";

declare module "fastify" {
  interface FastifyRequest {
    workspaceId?: string;
    workspaceSlug?: string;
  }
}

export async function workspaceScope(
  req: FastifyRequest<{ Params: { slug: string } }>,
  reply: FastifyReply,
) {
  const slug = req.params.slug;
  if (!slug) {
    return reply.status(400).send({ error: "Workspace slug required" });
  }
  const ws = await prisma.workspace.findUnique({ where: { slug } });
  if (!ws) {
    return reply.status(404).send({ error: "Workspace not found" });
  }
  req.workspaceId = ws.id;
  req.workspaceSlug = ws.slug;
}
