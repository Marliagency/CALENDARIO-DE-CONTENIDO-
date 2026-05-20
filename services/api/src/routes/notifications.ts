import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { requireAuth } from "../lib/auth-middleware.js";

export async function notificationsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  /**
   * GET /api/v1/notifications?unreadOnly=true&limit=50
   */
  app.get<{
    Querystring: { unreadOnly?: string; limit?: string };
  }>("/", async (req) => {
    const limit = Math.min(parseInt(req.query.limit ?? "50", 10), 200);
    const unreadOnly = req.query.unreadOnly === "true";

    const items = await prisma.notification.findMany({
      where: {
        userId: req.user!.id,
        ...(unreadOnly && { readAt: null }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.id, readAt: null },
    });
    return { items, unreadCount };
  });

  /**
   * POST /api/v1/notifications/:id/read
   */
  app.post<{ Params: { id: string } }>("/:id/read", async (req, reply) => {
    const n = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!n) return reply.status(404).send({ error: "Not found" });
    if (n.readAt) return n; // ya leída, no-op
    return prisma.notification.update({
      where: { id: n.id },
      data: { readAt: new Date() },
    });
  });

  /**
   * POST /api/v1/notifications/read-all
   */
  app.post("/read-all", async (req) => {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { markedRead: result.count };
  });

  /**
   * DELETE /api/v1/notifications/:id
   */
  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const n = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!n) return reply.status(404).send({ error: "Not found" });
    await prisma.notification.delete({ where: { id: n.id } });
    return reply.status(204).send();
  });
}
