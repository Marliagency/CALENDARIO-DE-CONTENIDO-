import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";

export async function workspacesRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    const workspaces = await prisma.workspace.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return { workspaces };
  });

  app.get<{ Params: { slug: string } }>("/:slug", async (req, reply) => {
    const ws = await prisma.workspace.findUnique({ where: { slug: req.params.slug } });
    if (!ws) return reply.status(404).send({ error: "Not found" });
    return ws;
  });

  const createSchema = z.object({
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    type: z.enum(["brand", "personal", "client", "other"]),
    description: z.string().optional(),
    brandColorPrimary: z.string().optional(),
    brandColorSecondary: z.string().optional(),
    defaultTimezone: z.string().optional(),
    defaultLanguage: z.string().optional(),
  });

  app.post("/", async (req, reply) => {
    const body = createSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.flatten() });
    }
    const ws = await prisma.workspace.create({ data: body.data });
    await prisma.brandBrain.create({ data: { workspaceId: ws.id } });
    return reply.status(201).send(ws);
  });
}
