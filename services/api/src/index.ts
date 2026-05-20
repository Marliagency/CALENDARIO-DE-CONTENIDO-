import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { config } from "./config.js";
import { startJobRunner } from "./jobs/runner.js";
import { registerRoutes } from "./routes/index.js";

async function main() {
  const app = Fastify({ logger: true });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: config.corsOrigin, credentials: true });
  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max por upload
  });

  await registerRoutes(app);

  app.get("/health", async () => ({
    status: "ok",
    env: config.env,
    time: new Date().toISOString(),
  }));

  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`Pulse API listening on http://${config.host}:${config.port}`);
    if (process.env.PULSE_DISABLE_JOBS !== "1") {
      startJobRunner();
    }
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
