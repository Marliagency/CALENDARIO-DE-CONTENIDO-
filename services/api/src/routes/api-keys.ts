import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { parseJSON, stringifyJSON } from "../lib/json.js";
import { workspaceScope } from "../lib/workspace-scope.js";
import { generateApiKey } from "../lib/api-key-auth.js";

const SCOPES = ["ingest", "read_brain", "read_metrics"] as const;

export async function apiKeysRoutes(app: FastifyInstance) {
  app.addHook("preHandler", workspaceScope);

  app.get<{ Params: { slug: string } }>("/", async (req) => {
    const keys = await prisma.workspaceApiKey.findMany({
      where: { workspaceId: req.workspaceId! },
      orderBy: { createdAt: "desc" },
    });
    return keys.map(({ keyHash: _h, ...k }) => ({
      ...k,
      scopes: parseJSON(k.scopes, []),
    }));
  });

  const createSchema = z.object({
    name: z.string().min(1),
    scopes: z.array(z.enum(SCOPES)).min(1),
    expiresAt: z.string().datetime().optional(),
  });

  app.post<{ Params: { slug: string } }>("/", async (req, reply) => {
    const body = createSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const { token, prefix, hash } = generateApiKey();
    const key = await prisma.workspaceApiKey.create({
      data: {
        workspaceId: req.workspaceId!,
        name: body.data.name,
        keyHash: hash,
        keyPrefix: prefix,
        scopes: stringifyJSON(body.data.scopes),
        expiresAt: body.data.expiresAt ? new Date(body.data.expiresAt) : null,
      },
    });
    // Devolver el token solo en esta respuesta — luego solo se ve el prefix.
    return reply.status(201).send({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: parseJSON(key.scopes, []),
      token,
      warning: "Guarda este token ahora. No volverá a mostrarse.",
    });
  });

  app.delete<{ Params: { slug: string; id: string } }>(
    "/:id",
    async (req, reply) => {
      const key = await prisma.workspaceApiKey.findFirst({
        where: { id: req.params.id, workspaceId: req.workspaceId! },
      });
      if (!key) return reply.status(404).send({ error: "Not found" });
      await prisma.workspaceApiKey.delete({ where: { id: key.id } });
      return reply.status(204).send();
    },
  );
}
