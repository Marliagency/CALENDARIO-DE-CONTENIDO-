/**
 * Contrato común de los adapters de plataforma.
 *
 * Cada adapter implementa la integración con una red social específica.
 * El worker de publicación llama a estos métodos sin saber la plataforma.
 */

import type { PlatformVariant, SocialAccount } from "@prisma/client";

export interface PublishResult {
  platformPostId: string;
  publishedAt: Date;
}

export interface PlatformAdapter {
  /**
   * Intercambia el code de OAuth por tokens, y devuelve los datos de la cuenta.
   * Llamado tras el OAuth callback.
   */
  exchangeCode(code: string, redirectUri: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    accountInfo: {
      platformUserId: string;
      handle: string;
      displayName?: string;
      avatarUrl?: string;
      // Datos específicos de plataforma
      platformPageId?: string;
      platformIgUserId?: string;
      platformAdvertiserId?: string;
      platformChannelId?: string;
    };
  }>;

  /**
   * Renueva el access token usando el refresh token.
   */
  refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt: Date;
  }>;

  /**
   * Publica una variante. Devuelve el ID del post en la plataforma.
   * Idempotente vía idempotencyKey si la plataforma lo soporta.
   */
  publish(
    account: SocialAccount,
    variant: PlatformVariant,
    accessToken: string,
    idempotencyKey: string,
  ): Promise<PublishResult>;

  /**
   * Pull de métricas para una variante publicada.
   */
  fetchMetrics(
    account: SocialAccount,
    variant: PlatformVariant,
    accessToken: string,
  ): Promise<{
    reach?: number;
    impressions?: number;
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    completionRate?: number;
    raw?: unknown;
  }>;
}
