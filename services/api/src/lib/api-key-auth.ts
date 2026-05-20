import crypto from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../db.js";

export interface ApiKeyContext {
  workspaceId: string;
  apiKeyId: string;
  scopes: string[];
}

declare module "fastify" {
  interface FastifyRequest {
    apiKey?: ApiKeyContext;
  }
}

export async function resolveApiKey(token: string) {
  const prefix = token.slice(0, 14); // sk_ws_ + 8 chars
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const apiKey = await prisma.workspaceApiKey.findFirst({
    where: { keyPrefix: prefix, keyHash: hash },
  });
  if (!apiKey) return null;
  return {
    workspaceId: apiKey.workspaceId,
    apiKeyId: apiKey.id,
    scopes: JSON.parse(apiKey.scopes || "[]") as string[],
  };
}

export function requireApiKey(scope: string) {
  return async function (req: FastifyRequest, reply: FastifyReply) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Missing API key" });
    }
    const ctx = await resolveApiKey(auth.slice(7));
    if (!ctx) return reply.status(401).send({ error: "Invalid API key" });
    if (!ctx.scopes.includes(scope)) {
      return reply.status(403).send({ error: `Scope '${scope}' required` });
    }
    req.apiKey = ctx;
    await prisma.workspaceApiKey.update({
      where: { id: ctx.apiKeyId },
      data: { lastUsedAt: new Date() },
    });
  };
}

export function generateApiKey() {
  // sk_ws_ + 8 hex + 24 hex = sk_ws_xxxxxxxx_yyyyyyyyyyyyyyyyyyyyyyyy
  const prefix = "sk_ws_" + crypto.randomBytes(4).toString("hex");
  const secret = crypto.randomBytes(24).toString("hex");
  const token = `${prefix}_${secret}`;
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, prefix, hash };
}
