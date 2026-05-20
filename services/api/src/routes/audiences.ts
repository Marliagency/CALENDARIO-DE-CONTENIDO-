import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { parseJSON } from "../lib/json.js";
import { workspaceScope } from "../lib/workspace-scope.js";

export async function audiencesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", workspaceScope);

  app.get<{ Params: { slug: string } }>("/", async (req) => {
    const audiences = await prisma.audiencePreset.findMany({
      where: { workspaceId: req.workspaceId! },
    });
    return audiences.map((a) => ({
      ...a,
      geo: parseJSON(a.geo, []),
      languages: parseJSON(a.languages, []),
      interests: parseJSON(a.interests, []),
      behaviors: parseJSON(a.behaviors, []),
    }));
  });
}
