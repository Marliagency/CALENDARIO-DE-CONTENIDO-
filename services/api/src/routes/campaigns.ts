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

  const patchSchema = createSchema.partial().extend({
    status: z.string().optional(),
  });

  app.patch<{ Params: { slug: string; id: string } }>("/:id", async (req, reply) => {
    const body = patchSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const existing = await prisma.campaign.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId! },
    });
    if (!existing) return reply.status(404).send({ error: "Not found" });

    const update: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body.data)) {
      if (v === undefined) continue;
      if (k === "startAt" || k === "endAt") {
        update[k] = v ? new Date(v as string) : null;
      } else {
        update[k] = v;
      }
    }

    const updated = await prisma.campaign.update({
      where: { id: existing.id },
      data: update,
    });

    return updated;
  });

  app.delete<{ Params: { slug: string; id: string } }>("/:id", async (req, reply) => {
    const existing = await prisma.campaign.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId! },
    });
    if (!existing) return reply.status(404).send({ error: "Not found" });

    await prisma.campaign.delete({ where: { id: existing.id } });

    return reply.status(204).send();
  });
}
