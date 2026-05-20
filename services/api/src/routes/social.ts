import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { parseJSON } from "../lib/json.js";
import { workspaceScope } from "../lib/workspace-scope.js";

export async function socialRoutes(app: FastifyInstance) {
  app.addHook("preHandler", workspaceScope);

  app.get<{ Params: { slug: string } }>("/accounts", async (req) => {
    const accounts = await prisma.socialAccount.findMany({
      where: { workspaceId: req.workspaceId! },
      orderBy: [{ platform: "asc" }, { nickname: "asc" }],
    });
    // Nunca devolver tokens, ni cifrados ni en claro.
    return accounts.map(
      ({ accessTokenEncrypted: _at, refreshTokenEncrypted: _rt, ...acc }) => ({
        ...acc,
        activeFormats: parseJSON(acc.activeFormats, []),
      }),
    );
  });
}
