import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { storage } from "../lib/storage.js";
import { workspaceScope } from "../lib/workspace-scope.js";

const VALID_SECTIONS = [
  "logo",
  "screenshot",
  "ad_own",
  "ad_reference",
  "competitor_ref",
  "document",
  "moodboard",
  "video_ref",
];

/**
 * POST /api/v1/w/:slug/uploads
 *
 * Multipart upload de un asset al storage local (dev) o R2 (prod).
 * Espera campos:
 *  - file (binario)
 *  - section (form field, una de VALID_SECTIONS)
 *  - name (opcional, fallback al filename)
 *  - description (opcional)
 *
 * Crea un BrandAsset y devuelve la URL firmada.
 */
export async function uploadsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", workspaceScope);

  app.post<{ Params: { slug: string } }>("/", async (req, reply) => {
    const parts = req.parts();
    let fileBuf: Buffer | null = null;
    let originalFilename = "asset";
    let fileType: string | undefined;
    const fields: Record<string, string> = {};

    for await (const part of parts) {
      if (part.type === "file") {
        if (fileBuf) {
          return reply.status(400).send({ error: "Only one file per upload" });
        }
        fileBuf = await part.toBuffer();
        originalFilename = part.filename ?? "asset";
        fileType = part.mimetype;
      } else {
        fields[part.fieldname] = String(part.value);
      }
    }

    if (!fileBuf) {
      return reply.status(400).send({ error: "Missing file" });
    }

    const section = fields.section;
    if (!section || !VALID_SECTIONS.includes(section)) {
      return reply.status(400).send({
        error: `Field 'section' required, one of: ${VALID_SECTIONS.join(", ")}`,
      });
    }

    const { key } = await storage.put({
      workspaceId: req.workspaceId!,
      filename: originalFilename,
      body: fileBuf,
    });

    const asset = await prisma.brandAsset.create({
      data: {
        workspaceId: req.workspaceId!,
        section,
        name: fields.name ?? originalFilename,
        description: fields.description,
        fileUrl: storage.signedUrl(key),
        fileType,
        fileSizeBytes: fileBuf.byteLength,
        tags: "[]",
        metadata: "{}",
      },
    });

    await prisma.auditLog.create({
      data: {
        workspaceId: req.workspaceId!,
        entityType: "BrandAsset",
        entityId: asset.id,
        action: "upload",
        notes: `${section} · ${originalFilename}`,
      },
    });

    return reply.status(201).send({
      id: asset.id,
      section: asset.section,
      name: asset.name,
      fileUrl: asset.fileUrl,
      fileSizeBytes: asset.fileSizeBytes,
    });
  });
}
