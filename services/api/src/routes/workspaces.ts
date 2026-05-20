import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { tryAuth } from "../lib/auth-middleware.js";

export async function workspacesRoutes(app: FastifyInstance) {
  app.get("/", async (req) => {
    await tryAuth(req);
    if (req.user) {
      // Solo workspaces de los que el usuario es miembro.
      const memberships = await prisma.workspaceMember.findMany({
        where: { userId: req.user.id },
        include: { workspace: true },
        orderBy: { workspace: { sortOrder: "asc" } },
      });
      return { workspaces: memberships.map((m) => m.workspace) };
    }
    // Sin sesión (modo dev): todos.
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

  const updateSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    brandColorPrimary: z.string().optional(),
    brandColorSecondary: z.string().optional(),
    defaultTimezone: z.string().optional(),
    defaultLanguage: z.string().optional(),
    status: z.enum(["active", "paused", "archived"]).optional(),
    sortOrder: z.number().int().optional(),
  });

  app.patch<{ Params: { slug: string } }>("/:slug", async (req, reply) => {
    const body = updateSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const ws = await prisma.workspace.findUnique({ where: { slug: req.params.slug } });
    if (!ws) return reply.status(404).send({ error: "Not found" });
    const updated = await prisma.workspace.update({
      where: { id: ws.id },
      data: body.data,
    });
    await prisma.auditLog.create({
      data: {
        workspaceId: ws.id,
        entityType: "Workspace",
        entityId: ws.id,
        action: "update",
        notes: Object.keys(body.data).join(", "),
      },
    });
    return updated;
  });

  app.delete<{ Params: { slug: string } }>("/:slug", async (req, reply) => {
    const ws = await prisma.workspace.findUnique({ where: { slug: req.params.slug } });
    if (!ws) return reply.status(404).send({ error: "Not found" });
    if (ws.status !== "archived") {
      return reply.status(400).send({
        error: "Workspace must be archived before deletion",
      });
    }
    await prisma.workspace.delete({ where: { id: ws.id } });
    return reply.status(204).send();
  });
}
