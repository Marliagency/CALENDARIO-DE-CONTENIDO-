import type { FastifyInstance } from "fastify";
import { workspacesRoutes } from "./workspaces.js";
import { brainRoutes } from "./brain.js";
import { contentRoutes } from "./content.js";
import { socialRoutes } from "./social.js";
import { metricsRoutes } from "./metrics.js";
import { ingestRoutes } from "./ingest.js";

export async function registerRoutes(app: FastifyInstance) {
  await app.register(workspacesRoutes, { prefix: "/api/v1/workspaces" });
  await app.register(brainRoutes, { prefix: "/api/v1/w/:slug/brain" });
  await app.register(contentRoutes, { prefix: "/api/v1/w/:slug/content" });
  await app.register(socialRoutes, { prefix: "/api/v1/w/:slug/social" });
  await app.register(metricsRoutes, { prefix: "/api/v1/w/:slug/metrics" });
  await app.register(ingestRoutes, { prefix: "/api/v1/ingest" });
}
