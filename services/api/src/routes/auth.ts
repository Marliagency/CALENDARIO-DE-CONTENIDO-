import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { hashPassword, verifyPassword } from "../lib/passwords.js";
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC, signSession } from "../lib/jwt.js";
import { requireAuth } from "../lib/auth-middleware.js";
import { config } from "../config.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function setSessionCookie(reply: any, token: string) {
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.env === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

// Rate limit estricto para login/register: 10 req/min por IP — anti brute-force.
const AUTH_LIMIT = {
  rateLimit: {
    max: 10,
    timeWindow: "1 minute",
    keyGenerator: (req: any) => `auth:${req.ip}`,
  },
};

export async function authRoutes(app: FastifyInstance) {
  // ---------- POST /register ----------
  app.post("/register", { config: AUTH_LIMIT }, async (req, reply) => {
    const body = registerSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const existing = await prisma.user.findUnique({
      where: { email: body.data.email },
    });
    if (existing) return reply.status(409).send({ error: "Email already registered" });

    const hash = await hashPassword(body.data.password);
    const user = await prisma.user.create({
      data: {
        email: body.data.email,
        passwordHash: hash,
        name: body.data.name,
      },
    });

    const token = await signSession({
      sub: user.id,
      email: user.email,
      name: user.name ?? undefined,
    });
    setSessionCookie(reply, token);
    return reply.status(201).send({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  });

  // ---------- POST /login ----------
  app.post("/login", { config: AUTH_LIMIT }, async (req, reply) => {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const user = await prisma.user.findUnique({ where: { email: body.data.email } });
    if (!user || !user.passwordHash) {
      // Mismo error que password incorrecto para no filtrar emails registrados.
      return reply.status(401).send({ error: "Invalid credentials" });
    }
    const ok = await verifyPassword(body.data.password, user.passwordHash);
    if (!ok) return reply.status(401).send({ error: "Invalid credentials" });

    const token = await signSession({
      sub: user.id,
      email: user.email,
      name: user.name ?? undefined,
    });
    setSessionCookie(reply, token);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  });

  // ---------- POST /logout ----------
  app.post("/logout", async (_req, reply) => {
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return reply.status(204).send();
  });

  // ---------- GET /me ----------
  app.get("/me", { preHandler: requireAuth }, async (req) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        memberships: {
          include: { workspace: true },
        },
      },
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      workspaces: user.memberships.map((m) => ({
        role: m.role,
        slug: m.workspace.slug,
        name: m.workspace.name,
        brandColorPrimary: m.workspace.brandColorPrimary,
        status: m.workspace.status,
      })),
    };
  });

  // ---------- PATCH /me ----------
  const updateMeSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    email: z.string().email().optional(),
    avatarUrl: z.string().url().nullable().optional(),
  });

  app.patch("/me", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_body", details: parsed.error.flatten() });
    }
    const data = parsed.data;
    if (data.email) {
      const existing = await prisma.user.findFirst({
        where: { email: data.email, NOT: { id: req.user!.id } },
      });
      if (existing) {
        return reply.status(409).send({ error: "email_taken" });
      }
    }
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
      },
    });
    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      avatarUrl: updated.avatarUrl,
    };
  });
}
