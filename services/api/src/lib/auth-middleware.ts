import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../db.js";
import { SESSION_COOKIE, verifySession } from "./jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: { id: string; email: string; name?: string };
  }
}

/**
 * `requireAuth` — exige sesión JWT válida. Setea req.user.
 * 401 si falta cookie o token inválido.
 */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return reply.status(401).send({ error: "Not authenticated" });
  const session = await verifySession(token);
  if (!session) return reply.status(401).send({ error: "Invalid session" });
  req.user = { id: session.sub, email: session.email, name: session.name };
}

/**
 * `tryAuth` — auth opcional. Si hay token válido, setea req.user.
 * Si no, sigue sin error. Útil para endpoints que aceptan sesión o API key.
 */
export async function tryAuth(req: FastifyRequest) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return;
  const session = await verifySession(token);
  if (session) {
    req.user = { id: session.sub, email: session.email, name: session.name };
  }
}

/**
 * Verifica que el usuario es miembro del workspace.
 * Usado por workspaceScope cuando hay sesión activa.
 */
export async function isWorkspaceMember(userId: string, workspaceId: string) {
  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId },
  });
  return !!member;
}
