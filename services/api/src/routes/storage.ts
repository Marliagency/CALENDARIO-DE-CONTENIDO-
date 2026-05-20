import type { FastifyInstance } from "fastify";
import { storage } from "../lib/storage.js";

/**
 * Serve assets uploaded via storage abstraction.
 * En dev valida la firma corta de la URL (signedUrl). En producción esto
 * se sustituye por servir desde R2/S3 directo con su propio mecanismo de
 * presigned URLs.
 */
export async function storageRoutes(app: FastifyInstance) {
  app.get<{
    Params: { workspaceId: string; filename: string };
    Querystring: { exp?: string; sig?: string };
  }>("/:workspaceId/:filename", async (req, reply) => {
    const { workspaceId, filename } = req.params;
    const key = `${workspaceId}/${filename}`;
    const { exp, sig } = req.query;
    if (!exp || !sig) {
      return reply.status(403).send({ error: "Missing exp/sig query params" });
    }
    if (!storage.verifySigned(key, exp, sig)) {
      return reply.status(403).send({ error: "Invalid or expired signature" });
    }
    try {
      const buf = await storage.read(key);
      return reply.send(buf);
    } catch {
      return reply.status(404).send({ error: "Not found" });
    }
  });
}
