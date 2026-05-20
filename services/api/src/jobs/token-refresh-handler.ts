import { prisma } from "../db.js";
import { adapterFor } from "../adapters/index.js";
import { decrypt, encrypt } from "../lib/crypto.js";
import type { JobPayload } from "../lib/jobs.js";

/**
 * Renueva el access token de una cuenta social.
 *
 * En esta fase los adapters reales no están implementados, así que el handler
 * solo se ejerce contra cuentas creadas vía dev-connect (cuyos tokens son
 * mock). Cuando se complete la integración Meta/TikTok/YouTube, este handler
 * funcionará sin cambios.
 */
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
      data: {
        status: "needs_reauth",
        lastError: msg,
      },
    });
    throw err;
  }
}

/**
 * Programa jobs de refresh para todas las cuentas cuyos tokens expiran
 * en las próximas 24h (excluyendo las ya en needs_reauth/disconnected).
 *
 * Se llama desde el scheduler cada hora.
 */
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
