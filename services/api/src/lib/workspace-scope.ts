import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../db.js";
import { tryAuth, isWorkspaceMember } from "./auth-middleware.js";
import { resolveApiKey } from "./api-key-auth.js";

declare module "fastify" {
  interface FastifyRequest {
    workspaceId?: string;
    workspaceSlug?: string;
  }
}

/**
 * Middleware de scope de workspace.
 *
 * 1. Resuelve el slug → workspace_id.
 * 2. Si hay sesión (cookie), verifica que el usuario es miembro → 403 si no.
 * 3. Si hay API key, verifica que el workspace de la key coincide con el slug.
 * 4. Si no hay ni sesión ni API key → permite continuar (compatibilidad
 *    con el modo dev actual). En producción se debe combinar con
 *    requireAuth a nivel de route si se requiere usuario.
 */
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

  // Si hay cookie de sesión, validamos membresía.
  await tryAuth(req);
  if (req.user) {
    const ok = await isWorkspaceMember(req.user.id, ws.id);
    if (!ok) {
      return reply.status(403).send({ error: "Not a member of this workspace" });
    }
    return;
  }

  // Si llega API key, validamos que sea del mismo workspace.
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    const ctx = await resolveApiKey(auth.slice(7));
    if (!ctx) {
      return reply.status(401).send({ error: "Invalid API key" });
    }
    if (ctx.workspaceId !== ws.id) {
      return reply.status(403).send({
        error: "API key does not belong to this workspace",
      });
    }
    req.apiKey = ctx;
  }

  // Si no hay ni sesión ni API key, dejamos pasar (modo dev / IA agente local).
  // Para forzar auth, usar requireAuth como preHandler adicional.
}
