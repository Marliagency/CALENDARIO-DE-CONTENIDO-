import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { hmacVerify } from "../lib/crypto.js";

/**
 * Webhooks entrantes de las plataformas.
 *
 * - Meta envía un GET para verificación inicial con hub.challenge.
 * - Posteriores POSTs llevan firma en X-Hub-Signature-256 (sha256=<hex>).
 * - TikTok envía firmas similares en X-TT-Signature.
 *
 * Esta fase solo valida y loguea. El procesamiento real (comments, mentions,
 * delivery confirmations) se añade junto con cada feature.
 */

export async function webhookRoutes(app: FastifyInstance) {
  // ---------- Meta (Instagram + Facebook) ----------
  app.get<{
    Querystring: {
      "hub.mode": string;
      "hub.verify_token": string;
      "hub.challenge": string;
    };
  }>("/meta", async (req, reply) => {
    const { "hub.mode": mode, "hub.verify_token": token, "hub.challenge": challenge } = req.query;
    const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;
    if (mode === "subscribe" && expected && token === expected) {
      return reply.type("text/plain").send(challenge);
    }
    return reply.status(403).send({ error: "Verify token mismatch" });
  });

  app.post("/meta", async (req, reply) => {
    const signature = req.headers["x-hub-signature-256"];
    if (typeof signature !== "string") {
      return reply.status(400).send({ error: "Missing signature" });
    }
    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) return reply.status(503).send({ error: "App not configured" });

    const raw = JSON.stringify(req.body);
    const sig = signature.replace("sha256=", "");
    const expected = crypto.createHmac("sha256", appSecret).update(raw).digest("hex");
    try {
      const ok = crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
      if (!ok) return reply.status(403).send({ error: "Invalid signature" });
    } catch {
      return reply.status(403).send({ error: "Invalid signature" });
    }

    app.log.info({ payload: req.body }, "Meta webhook received");
    // TODO: dispatch al handler correspondiente según el `object` recibido.
    return { received: true };
  });

  // ---------- TikTok ----------
  app.post("/tiktok", async (req, reply) => {
    const signature = req.headers["x-tt-signature"];
    if (typeof signature !== "string") {
      return reply.status(400).send({ error: "Missing signature" });
    }
    const secret = process.env.TIKTOK_CLIENT_SECRET;
    if (!secret) return reply.status(503).send({ error: "App not configured" });

    const raw = JSON.stringify(req.body);
    if (!hmacVerify(raw, secret, signature)) {
      return reply.status(403).send({ error: "Invalid signature" });
    }
    app.log.info({ payload: req.body }, "TikTok webhook received");
    return { received: true };
  });
}
