import type { FastifyInstance } from "fastify";
import { listProfiles, getProfileForWorkspace } from "../adapters/upload-post.js";
import { workspaceScope } from "../lib/workspace-scope.js";

/**
 * Endpoint que devuelve el estado de las cuentas conectadas en Upload-Post
 * para un workspace dado. Consulta la API de Upload-Post para saber que
 * redes estan vinculadas al perfil del workspace.
 */
export async function connectionsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", workspaceScope);

  app.get<{ Params: { slug: string } }>("/status", async (req, reply) => {
    let profile: string;
    try {
      profile = getProfileForWorkspace(req.params.slug);
    } catch (err) {
      return reply.status(412).send({
        error: "profile_not_configured",
        message: err instanceof Error ? err.message : String(err),
      });
    }

    if (!process.env.UPLOAD_POST_API_KEY) {
      return reply.status(412).send({
        error: "upload_post_not_configured",
        message: "UPLOAD_POST_API_KEY no esta configurada en .env.local",
        profile,
      });
    }

    try {
      const profiles = await listProfiles();
      const match = profiles.find((p) => p.username === profile);
      if (!match) {
        return {
          profile,
          found: false,
          accounts: [],
          manageUrl: "https://app.upload-post.com",
        };
      }
      const accounts = Object.entries(match.social_accounts).map(([platform, handle]) => ({
        platform,
        handle,
        connected: handle != null,
      }));
      return {
        profile,
        found: true,
        accounts,
        manageUrl: "https://app.upload-post.com",
      };
    } catch (err) {
      return reply.status(502).send({
        error: "upload_post_unreachable",
        message: err instanceof Error ? err.message : String(err),
        profile,
      });
    }
  });
}
