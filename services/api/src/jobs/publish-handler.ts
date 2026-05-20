import { prisma } from "../db.js";
import { adapterFor } from "../adapters/index.js";
import { decrypt } from "../lib/crypto.js";
import type { JobPayload } from "../lib/jobs.js";

/**
 * Handler del job "publish" — toma una PlatformVariant y la publica
 * vía el adapter de su plataforma.
 *
 * En esta fase los adapters son stubs, por lo que el publish lanzará un error
 * controlado y el job entrará en retry/failed. Esto es esperado hasta que
 * se completen las integraciones OAuth (Fase 5).
 */
export async function publishHandler(payload: JobPayload["publish"]) {
  const variant = await prisma.platformVariant.findUnique({
    where: { id: payload.platformVariantId },
    include: { socialAccount: true },
  });
  if (!variant) throw new Error(`Variant ${payload.platformVariantId} not found`);
  if (!variant.socialAccount) throw new Error(`Social account missing`);
  if (!variant.socialAccount.accessTokenEncrypted) {
    throw new Error(`No access token for account ${variant.socialAccount.id}`);
  }

  await prisma.platformVariant.update({
    where: { id: variant.id },
    data: { status: "publishing" },
  });

  const adapter = adapterFor(variant.platform);
  const accessToken = decrypt(variant.socialAccount.accessTokenEncrypted);
  const idempotencyKey = `${variant.id}:${variant.scheduledAt?.toISOString() ?? "now"}`;

  try {
    const result = await adapter.publish(
      variant.socialAccount,
      variant,
      accessToken,
      idempotencyKey,
    );

    await prisma.platformVariant.update({
      where: { id: variant.id },
      data: {
        status: "published",
        publishedAt: result.publishedAt,
        platformPostId: result.platformPostId,
      },
    });

    // Actualizar último publicado en la cuenta
    await prisma.socialAccount.update({
      where: { id: variant.socialAccount.id },
      data: { lastPublishedAt: result.publishedAt },
    });
  } catch (err) {
    await prisma.platformVariant.update({
      where: { id: variant.id },
      data: { status: "failed" },
    });
    throw err;
  }
}
