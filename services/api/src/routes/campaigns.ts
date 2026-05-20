import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { workspaceScope } from "../lib/workspace-scope.js";

export async function campaignsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", workspaceScope);

  app.get<{ Params: { slug: string } }>("/", async (req) => {
    return prisma.campaign.findMany({
      where: { workspaceId: req.workspaceId! },
      orderBy: { createdAt: "desc" },
    });
  });

  const createSchema = z.object({
    name: z.string().min(1),
    objective: z.string().optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    kpiName: z.string().optional(),
    kpiTarget: z.number().optional(),
    notes: z.string().optional(),
  });

  app.post<{ Params: { slug: string } }>("/", async (req, reply) => {
    const body = createSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const campaign = await prisma.campaign.create({
      data: {
        ...body.data,
        workspaceId: req.workspaceId!,
        startAt: body.data.startAt ? new Date(body.data.startAt) : null,
        endAt: body.data.endAt ? new Date(body.data.endAt) : null,
      },
    });
    return reply.status(201).send(campaign);
  });
}
