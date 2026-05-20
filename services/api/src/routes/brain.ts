import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { parseJSON } from "../lib/json.js";
import { workspaceScope } from "../lib/workspace-scope.js";

export async function brainRoutes(app: FastifyInstance) {
  app.addHook("preHandler", workspaceScope);

  app.get<{ Params: { slug: string } }>("/", async (req) => {
    const wsId = req.workspaceId!;
    const brain = await prisma.brandBrain.findUnique({ where: { workspaceId: wsId } });
    if (!brain) return null;
    return {
      ...brain,
      taglinesAlt: parseJSON(brain.taglinesAlt, []),
      whatWeAreNot: parseJSON(brain.whatWeAreNot, []),
      competitors: parseJSON(brain.competitors, []),
      brandAdjectives: parseJSON(brain.brandAdjectives, []),
      howWeDontTalk: parseJSON(brain.howWeDontTalk, []),
      copyApprovedExamples: parseJSON(brain.copyApprovedExamples, []),
      copyRejectedExamples: parseJSON(brain.copyRejectedExamples, []),
      claimsAllowed: parseJSON(brain.claimsAllowed, []),
      claimsForbidden: parseJSON(brain.claimsForbidden, []),
      disclaimersRequired: parseJSON(brain.disclaimersRequired, []),
    };
  });

  app.get<{ Params: { slug: string } }>("/personas", async (req) => {
    const personas = await prisma.buyerPersona.findMany({
      where: { workspaceId: req.workspaceId! },
    });
    return personas.map((p) => ({
      ...p,
      pains: parseJSON(p.pains, []),
      objections: parseJSON(p.objections, []),
      workingHooks: parseJSON(p.workingHooks, []),
      preferredPlatforms: parseJSON(p.preferredPlatforms, []),
    }));
  });

  app.get<{ Params: { slug: string } }>("/hooks", async (req) => {
    return prisma.hook.findMany({ where: { workspaceId: req.workspaceId! } });
  });

  app.get<{ Params: { slug: string } }>("/assets", async (req) => {
    const assets = await prisma.brandAsset.findMany({
      where: { workspaceId: req.workspaceId! },
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
    });
    return assets.map((a) => ({
      ...a,
      tags: parseJSON(a.tags, []),
      metadata: parseJSON(a.metadata, {}),
    }));
  });
}
