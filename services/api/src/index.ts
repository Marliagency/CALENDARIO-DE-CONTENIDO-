import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { config, isDev } from "./config.js";
import { startJobRunner } from "./jobs/runner.js";
import { registerRoutes } from "./routes/index.js";

async function main() {
  const app = Fastify({ logger: true });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: config.corsOrigin, credentials: true });
  await app.register(cookie, { secret: config.jwtSecret });
  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 },
  });

  // Rate limiting global por IP. Buckets más estrictos se aplican a nivel route.
  // Deshabilitado en tests (PULSE_DISABLE_RATE_LIMIT=1).
  if (process.env.PULSE_DISABLE_RATE_LIMIT !== "1") {
    await app.register(rateLimit, {
      global: true,
      max: 100,
      timeWindow: "1 minute",
      // Identifica por user.id si hay sesión, por API key si hay Bearer,
      // o por IP como fallback.
      keyGenerator: (req) => {
        if (req.user?.id) return `user:${req.user.id}`;
        const auth = req.headers.authorization;
        if (auth?.startsWith("Bearer ")) {
          return `apikey:${auth.slice(7, 22)}`;
        }
        return req.ip;
      },
      errorResponseBuilder: (_req, ctx) => ({
        statusCode: 429,
        error: "Too Many Requests",
        message: "Rate limit exceeded",
        retryAfterSec: Math.ceil(ctx.ttl / 1000),
        limit: ctx.max,
      }),
      // En dev permitimos burst alto para no estorbar.
      skipOnError: isDev,
    });
  }

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
