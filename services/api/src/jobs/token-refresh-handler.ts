import { prisma } from "../db.js";
import { adapterFor } from "../adapters/index.js";
import { decrypt, encrypt } from "../lib/crypto.js";
import type { JobPayload } from "../lib/jobs.js";
import { notifyTokenExpiring } from "../lib/notifications.js";

export async function tokenRefreshHandler(payload: JobPayload["refresh_token"]) {
  const account = await prisma.socialAccount.findUnique({
    where: { id: payload.socialAccountId },
  });
  if (!account) throw new Error(`Account ${payload.socialAccountId} not found`);
  if (!account.refreshTokenEncrypted) {
    throw new Error(`Account ${account.id} has no refresh token`);
  }

  const adapter = adapterFor(account.platform);
  const refreshToken = decrypt(account.refreshTokenEncrypted);

  try {
    const result = await adapter.refreshToken(refreshToken);
    await prisma.socialAccount.update({
      where: { id: account.id },
      data: {
        accessTokenEncrypted: encrypt(result.accessToken),
        refreshTokenEncrypted: result.refreshToken
          ? encrypt(result.refreshToken)
          : account.refreshTokenEncrypted,
        tokenExpiresAt: result.expiresAt,
        status: "healthy",
        lastError: null,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.socialAccount.update({
      where: { id: account.id },
      data: { status: "needs_reauth", lastError: msg },
    });
    throw err;
  }
}

export async function scheduleTokenRefreshes() {
  const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const accounts = await prisma.socialAccount.findMany({
    where: {
      status: "healthy",
      tokenExpiresAt: { lte: soon, not: null },
      refreshTokenEncrypted: { not: null },
    },
  });
  return accounts;
}

/**
 * Notifica a workspaces con tokens próximos a expirar (1d - 7d).
 * Se ejecuta una vez al día como parte del job runner.
 */
export async function notifyExpiringTokens() {
  const min = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const max = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accounts = await prisma.socialAccount.findMany({
    where: {
      tokenExpiresAt: { gte: min, lte: max },
    },
    include: { workspace: true },
  });
  for (const acc of accounts) {
    if (!acc.tokenExpiresAt) continue;
    const daysLeft = Math.ceil(
      (acc.tokenExpiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
    );
    // Evitar duplicados: si ya notificamos en las últimas 24h, skip.
    const existing = await prisma.notification.findFirst({
      where: {
        entityType: "SocialAccount",
        entityId: acc.id,
        kind: "token_expiring",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (existing) continue;
    await notifyTokenExpiring(
      acc.workspaceId,
      acc.id,
      acc.handle,
      acc.workspace.slug,
      daysLeft,
    );
  }
}
