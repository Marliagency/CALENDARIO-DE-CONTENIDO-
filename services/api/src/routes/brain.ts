import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { parseJSON, stringifyJSON } from "../lib/json.js";
import { workspaceScope } from "../lib/workspace-scope.js";

function serializeBrain(brain: {
  [key: string]: unknown;
  taglinesAlt: string;
  whatWeAreNot: string;
  competitors: string;
  brandAdjectives: string;
  howWeDontTalk: string;
  copyApprovedExamples: string;
  copyRejectedExamples: string;
  claimsAllowed: string;
  claimsForbidden: string;
  disclaimersRequired: string;
}) {
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
}

function serializePersona(p: {
  [key: string]: unknown;
  pains: string;
  objections: string;
  workingHooks: string;
  preferredPlatforms: string;
}) {
  return {
    ...p,
    pains: parseJSON(p.pains, []),
    objections: parseJSON(p.objections, []),
    workingHooks: parseJSON(p.workingHooks, []),
    preferredPlatforms: parseJSON(p.preferredPlatforms, []),
  };
}

export async function brainRoutes(app: FastifyInstance) {
  app.addHook("preHandler", workspaceScope);

  // ---------- Brand Brain GET + PATCH ----------
  app.get<{ Params: { slug: string } }>("/", async (req) => {
    const wsId = req.workspaceId!;
    const brain = await prisma.brandBrain.findUnique({ where: { workspaceId: wsId } });
    if (!brain) return null;
    return serializeBrain(brain);
  });

  const brainPatchSchema = z.object({
    productDescription: z.string().optional(),
    taglineMain: z.string().optional(),
    taglinesAlt: z.array(z.string()).optional(),
    problemSolved: z.string().optional(),
    uniqueValueProp: z.string().optional(),
    whatWeAreNot: z.array(z.string()).optional(),
    competitors: z
      .array(z.object({ name: z.string(), differentiator: z.string() }))
      .optional(),
    techStackNotes: z.string().optional(),
    pricingNotes: z.string().optional(),
    monetizationNotes: z.string().optional(),
    brandAdjectives: z.array(z.string()).optional(),
    howWeTalk: z.string().optional(),
    howWeDontTalk: z.array(z.string()).optional(),
    copyApprovedExamples: z
      .array(
        z.object({
          text: z.string(),
          platform: z.string(),
          notes: z.string().optional(),
        }),
      )
      .optional(),
    copyRejectedExamples: z
      .array(z.object({ text: z.string(), reason: z.string() }))
      .optional(),
    claimsAllowed: z.array(z.string()).optional(),
    claimsForbidden: z.array(z.string()).optional(),
    disclaimersRequired: z.array(z.string()).optional(),
  });

  app.patch<{ Params: { slug: string } }>("/", async (req, reply) => {
    const body = brainPatchSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const wsId = req.workspaceId!;
    // Ensure brain exists (upsert)
    await prisma.brandBrain.upsert({
      where: { workspaceId: wsId },
      update: {},
      create: { workspaceId: wsId },
    });

    // Stringify campos JSON
    const update: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body.data)) {
      if (Array.isArray(v) || (typeof v === "object" && v !== null)) {
        update[k] = stringifyJSON(v);
      } else if (v !== undefined) {
        update[k] = v;
      }
    }

    const updated = await prisma.brandBrain.update({
      where: { workspaceId: wsId },
      data: update,
    });

    await prisma.auditLog.create({
      data: {
        workspaceId: wsId,
        entityType: "BrandBrain",
        entityId: updated.id,
        action: "update",
        notes: Object.keys(body.data).join(", "),
      },
    });

    return serializeBrain(updated);
  });

  // ---------- Personas CRUD ----------
  app.get<{ Params: { slug: string } }>("/personas", async (req) => {
    const personas = await prisma.buyerPersona.findMany({
      where: { workspaceId: req.workspaceId! },
    });
    return personas.map(serializePersona);
  });

  const personaSchema = z.object({
    name: z.string().min(1),
    ageRange: z.string().optional(),
    demographics: z.string().optional(),
    dailyContext: z.string().optional(),
    pains: z.array(z.string()).optional(),
    jtbdFunctional: z.string().optional(),
    jtbdEmotional: z.string().optional(),
    jtbdSocial: z.string().optional(),
    objections: z.array(z.string()).optional(),
    workingHooks: z.array(z.string()).optional(),
    promise: z.string().optional(),
    proof: z.string().optional(),
    preferredCta: z.string().optional(),
    preferredPlatforms: z.array(z.string()).optional(),
    isProTarget: z.boolean().optional(),
    notes: z.string().optional(),
  });

  app.post<{ Params: { slug: string } }>("/personas", async (req, reply) => {
    const body = personaSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const persona = await prisma.buyerPersona.create({
      data: {
        workspaceId: req.workspaceId!,
        name: body.data.name,
        ageRange: body.data.ageRange,
        demographics: body.data.demographics,
        dailyContext: body.data.dailyContext,
        pains: stringifyJSON(body.data.pains ?? []),
        jtbdFunctional: body.data.jtbdFunctional,
        jtbdEmotional: body.data.jtbdEmotional,
        jtbdSocial: body.data.jtbdSocial,
        objections: stringifyJSON(body.data.objections ?? []),
        workingHooks: stringifyJSON(body.data.workingHooks ?? []),
        promise: body.data.promise,
        proof: body.data.proof,
        preferredCta: body.data.preferredCta,
        preferredPlatforms: stringifyJSON(body.data.preferredPlatforms ?? []),
        isProTarget: body.data.isProTarget ?? false,
        notes: body.data.notes,
      },
    });
    return reply.status(201).send(serializePersona(persona));
  });

  app.patch<{ Params: { slug: string; id: string } }>(
    "/personas/:id",
    async (req, reply) => {
      const body = personaSchema.partial().safeParse(req.body);
      if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

      const existing = await prisma.buyerPersona.findFirst({
        where: { id: req.params.id, workspaceId: req.workspaceId! },
      });
      if (!existing) return reply.status(404).send({ error: "Not found" });

      const update: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(body.data)) {
        if (Array.isArray(v)) update[k] = stringifyJSON(v);
        else if (v !== undefined) update[k] = v;
      }
      const updated = await prisma.buyerPersona.update({
        where: { id: existing.id },
        data: update,
      });
      return serializePersona(updated);
    },
  );

  app.delete<{ Params: { slug: string; id: string } }>(
    "/personas/:id",
    async (req, reply) => {
      const existing = await prisma.buyerPersona.findFirst({
        where: { id: req.params.id, workspaceId: req.workspaceId! },
      });
      if (!existing) return reply.status(404).send({ error: "Not found" });
      await prisma.buyerPersona.delete({ where: { id: existing.id } });
      return reply.status(204).send();
    },
  );

  // ---------- Hooks ----------
  app.get<{ Params: { slug: string } }>("/hooks", async (req) => {
    return prisma.hook.findMany({ where: { workspaceId: req.workspaceId! } });
  });

  app.post<{ Params: { slug: string } }>("/hooks", async (req, reply) => {
    const schema = z.object({
      text: z.string().min(1),
      personaId: z.string().optional(),
      format: z.string().optional(),
      hypothesis: z.string().optional(),
    });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const hook = await prisma.hook.create({
      data: {
        workspaceId: req.workspaceId!,
        ...body.data,
      },
    });
    return reply.status(201).send(hook);
  });

  // ---------- QC Rules ----------
  app.get<{ Params: { slug: string } }>("/qc-rules", async (req) => {
    const rules = await prisma.qCRule.findMany({
      where: { workspaceId: req.workspaceId! },
      orderBy: { createdAt: "asc" },
    });
    return rules.map((r) => ({
      ...r,
      appliesToFormats: parseJSON(r.appliesToFormats, []),
      appliesToPlatforms: parseJSON(r.appliesToPlatforms, []),
      params: parseJSON(r.params, {}),
    }));
  });

  const qcRuleSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    rule: z.string(),
    severity: z.enum(["warning", "error"]),
    enabled: z.boolean().default(true),
    params: z.record(z.unknown()).optional(),
    appliesToFormats: z.array(z.string()).default([]),
    appliesToPlatforms: z.array(z.string()).default([]),
  });

  app.post<{ Params: { slug: string } }>("/qc-rules", async (req, reply) => {
    const body = qcRuleSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const rule = await prisma.qCRule.create({
      data: {
        workspaceId: req.workspaceId!,
        name: body.data.name,
        ruleType: body.data.rule,
        severity: body.data.severity,
        active: body.data.enabled,
        params: stringifyJSON(body.data.params ?? {}),
        appliesToFormats: stringifyJSON(body.data.appliesToFormats),
        appliesToPlatforms: stringifyJSON(body.data.appliesToPlatforms),
      },
    });

    return reply.status(201).send({
      ...rule,
      appliesToFormats: parseJSON(rule.appliesToFormats, []),
      appliesToPlatforms: parseJSON(rule.appliesToPlatforms, []),
      params: parseJSON(rule.params, {}),
    });
  });

  const qcRulePatchSchema = qcRuleSchema.partial();

  app.patch<{ Params: { slug: string; ruleId: string } }>("/qc-rules/:ruleId", async (req, reply) => {
    const body = qcRulePatchSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const existing = await prisma.qCRule.findFirst({
      where: { id: req.params.ruleId, workspaceId: req.workspaceId! },
    });
    if (!existing) return reply.status(404).send({ error: "Not found" });

    const update: Record<string, unknown> = {};
    if (body.data.name !== undefined) update.name = body.data.name;
    if (body.data.rule !== undefined) update.ruleType = body.data.rule;
    if (body.data.severity !== undefined) update.severity = body.data.severity;
    if (body.data.enabled !== undefined) update.active = body.data.enabled;
    if (body.data.params !== undefined) update.params = stringifyJSON(body.data.params);
    if (body.data.appliesToFormats !== undefined) update.appliesToFormats = stringifyJSON(body.data.appliesToFormats);
    if (body.data.appliesToPlatforms !== undefined) update.appliesToPlatforms = stringifyJSON(body.data.appliesToPlatforms);

    const updated = await prisma.qCRule.update({
      where: { id: existing.id },
      data: update,
    });

    return {
      ...updated,
      appliesToFormats: parseJSON(updated.appliesToFormats, []),
      appliesToPlatforms: parseJSON(updated.appliesToPlatforms, []),
      params: parseJSON(updated.params, {}),
    };
  });

  app.delete<{ Params: { slug: string; ruleId: string } }>("/qc-rules/:ruleId", async (req, reply) => {
    const existing = await prisma.qCRule.findFirst({
      where: { id: req.params.ruleId, workspaceId: req.workspaceId! },
    });
    if (!existing) return reply.status(404).send({ error: "Not found" });

    await prisma.qCRule.delete({ where: { id: existing.id } });

    return reply.status(204).send();
  });

  // ---------- Assets ----------
  app.get<{
    Params: { slug: string };
    Querystring: { section?: string };
  }>("/assets", async (req) => {
    const assets = await prisma.brandAsset.findMany({
      where: {
        workspaceId: req.workspaceId!,
        ...(req.query.section && { section: req.query.section }),
      },
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
    });
    return assets.map((a) => ({
      ...a,
      tags: parseJSON(a.tags, []),
      metadata: parseJSON(a.metadata, {}),
    }));
  });

  app.delete<{ Params: { slug: string; id: string } }>(
    "/assets/:id",
    async (req, reply) => {
      const existing = await prisma.brandAsset.findFirst({
        where: { id: req.params.id, workspaceId: req.workspaceId! },
      });
      if (!existing) return reply.status(404).send({ error: "Not found" });
      await prisma.brandAsset.delete({ where: { id: existing.id } });
      return reply.status(204).send();
    },
  );
}
