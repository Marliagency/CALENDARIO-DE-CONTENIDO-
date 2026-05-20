/**
 * Adapter Meta (Instagram + Facebook).
 *
 * Implementa el flujo real contra la Graph API v19.0.
 *
 * Referencias:
 * - Graph API: https://developers.facebook.com/docs/graph-api
 * - IG Content Publishing: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
 * - Long-lived tokens: https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived
 */

import type { SocialAccount, PlatformVariant } from "@prisma/client";
import type { PlatformAdapter, PublishResult } from "./types.js";
import { parseJSON } from "../lib/json.js";

const GRAPH = "https://graph.facebook.com/v19.0";

// ─── helpers ──────────────────────────────────────────────────────────────────

function buildCaption(variant: PlatformVariant): string {
  const parts: string[] = [];
  if (variant.caption) parts.push(variant.caption);
  const tags = parseJSON<string[]>(variant.hashtags, []);
  if (tags.length > 0) parts.push(tags.join(" "));
  return parts.join("\n\n");
}

interface MetaApiError {
  error?: { message: string; code: number; type: string };
}

async function checkResponse(res: Response): Promise<unknown> {
  const json = (await res.json()) as MetaApiError & Record<string, unknown>;
  if (!res.ok || json.error) {
    const msg = json.error
      ? `Meta API [${json.error.code}] ${json.error.type}: ${json.error.message}`
      : `Meta API error HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

// ─── Instagram publish ─────────────────────────────────────────────────────────

async function publishInstagram(
  account: SocialAccount,
  variant: PlatformVariant,
  accessToken: string,
): Promise<PublishResult> {
  const igUserId = account.platformIgUserId;
  if (!igUserId) {
    throw new Error(
      "Se requiere el ID de usuario de Instagram (platformIgUserId). Edita la cuenta en Ajustes.",
    );
  }

  if (!variant.mediaUrl) {
    throw new Error(
      "Instagram requiere una URL de media (imagen o video). Sube el contenido primero.",
    );
  }

  const caption = buildCaption(variant);
  const isVideo =
    variant.mediaType === "reel" ||
    variant.mediaType === "ugc_video" ||
    variant.mediaType === "short";

  // Step 1: create media container
  const containerBody: Record<string, string> = {
    caption,
    access_token: accessToken,
  };

  if (isVideo) {
    containerBody["media_type"] = "REELS";
    containerBody["video_url"] = variant.mediaUrl;
  } else {
    containerBody["image_url"] = variant.mediaUrl;
  }

  const containerRes = await fetch(`${GRAPH}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(containerBody),
  });
  const containerData = (await checkResponse(containerRes)) as { id: string };
  const creationId = containerData.id;

  // For reels: poll until FINISHED
  if (isVideo) {
    const MAX_ATTEMPTS = 12;
    const POLL_MS = 5000;
    let finished = false;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      const statusRes = await fetch(
        `${GRAPH}/${creationId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`,
      );
      const statusData = (await checkResponse(statusRes)) as { status_code: string };
      if (statusData.status_code === "FINISHED") {
        finished = true;
        break;
      }
      if (statusData.status_code === "ERROR") {
        throw new Error("Error procesando el video en Instagram. Comprueba el formato y el URL.");
      }
    }

    if (!finished) {
      throw new Error(
        "Tiempo de espera agotado mientras Instagram procesaba el video. Reintenta en unos minutos.",
      );
    }
  }

  // Step 2: publish container
  const publishRes = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: creationId, access_token: accessToken }),
  });
  const publishData = (await checkResponse(publishRes)) as { id: string };

  return { platformPostId: publishData.id, publishedAt: new Date() };
}

// ─── Facebook publish ──────────────────────────────────────────────────────────

async function publishFacebook(
  account: SocialAccount,
  variant: PlatformVariant,
  accessToken: string,
): Promise<PublishResult> {
  const pageId = account.platformPageId;
  if (!pageId) {
    throw new Error(
      "Se requiere el Page ID de Facebook (platformPageId). Edita la cuenta en Ajustes.",
    );
  }

  const caption = buildCaption(variant);

  let endpoint: string;
  let bodyData: Record<string, string>;

  if (variant.mediaUrl && variant.mediaType === "image") {
    endpoint = `${GRAPH}/${pageId}/photos`;
    bodyData = {
      url: variant.mediaUrl,
      caption,
      access_token: accessToken,
      published: "true",
    };
  } else {
    endpoint = `${GRAPH}/${pageId}/feed`;
    bodyData = {
      message: caption,
      access_token: accessToken,
    };
    if (variant.mediaUrl) {
      bodyData["link"] = variant.mediaUrl;
    }
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyData),
  });
  const data = (await checkResponse(res)) as { id: string; post_id?: string };
  const postId = data.post_id ?? data.id;

  return { platformPostId: postId, publishedAt: new Date() };
}

// ─── adapter ───────────────────────────────────────────────────────────────────

export const metaAdapter: PlatformAdapter = {
  async exchangeCode(code, redirectUri) {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
      throw new Error(
        "META_APP_ID y META_APP_SECRET no configurados. Configura las credenciales en .env.local.",
      );
    }

    // Step 1: short-lived token
    const shortRes = await fetch(`${GRAPH}/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });
    const shortData = (await checkResponse(shortRes)) as { access_token: string };

    // Step 2: exchange for long-lived token
    const longRes = await fetch(
      `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(shortData.access_token)}`,
    );
    const longData = (await checkResponse(longRes)) as {
      access_token: string;
      expires_in?: number;
    };
    const longToken = longData.access_token;

    // Step 3: get user pages (and IG accounts)
    const pagesRes = await fetch(
      `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${encodeURIComponent(longToken)}`,
    );
    const pagesData = (await checkResponse(pagesRes)) as {
      data: Array<{
        id: string;
        name: string;
        access_token: string;
        instagram_business_account?: { id: string; username: string };
      }>;
    };

    const pages = pagesData.data ?? [];
    const firstIg = pages.find((p) => p.instagram_business_account);
    const expiresAt = longData.expires_in
      ? new Date(Date.now() + longData.expires_in * 1000)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60d fallback

    if (firstIg?.instagram_business_account) {
      const ig = firstIg.instagram_business_account;
      return {
        accessToken: firstIg.access_token || longToken,
        expiresAt,
        accountInfo: {
          platformUserId: ig.id,
          handle: ig.username,
          platformIgUserId: ig.id,
          platformPageId: firstIg.id,
        },
      };
    }

    // No IG account found — return first page
    if (pages.length > 0) {
      const page = pages[0];
      return {
        accessToken: page.access_token || longToken,
        expiresAt,
        accountInfo: {
          platformUserId: page.id,
          handle: page.name,
          platformPageId: page.id,
        },
      };
    }

    throw new Error(
      "No se encontraron cuentas de Instagram Business ni Pages de Facebook vinculadas a este token.",
    );
  },

  async refreshToken(currentToken) {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
      throw new Error("META_APP_ID y META_APP_SECRET no configurados.");
    }

    const res = await fetch(
      `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(currentToken)}`,
    );
    const data = (await checkResponse(res)) as {
      access_token: string;
      expires_in?: number;
    };

    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    return { accessToken: data.access_token, expiresAt };
  },

  async publish(account, variant, accessToken, _idempotencyKey) {
    if (account.platform === "instagram") {
      return publishInstagram(account, variant, accessToken);
    }
    if (account.platform === "facebook") {
      return publishFacebook(account, variant, accessToken);
    }
    throw new Error(`Meta adapter no soporta la plataforma "${account.platform}"`);
  },

  async fetchMetrics(account, variant, accessToken) {
    if (!variant.platformPostId) {
      throw new Error("No hay platformPostId guardado para esta variante.");
    }
    const postId = variant.platformPostId;

    if (account.platform === "instagram") {
      const postRes = await fetch(
        `${GRAPH}/${postId}?fields=like_count,comments_count,media_url&access_token=${encodeURIComponent(accessToken)}`,
      );
      const postData = (await checkResponse(postRes)) as {
        like_count?: number;
        comments_count?: number;
      };

      const insightsRes = await fetch(
        `${GRAPH}/${postId}/insights?metric=impressions,reach,saved,video_views&access_token=${encodeURIComponent(accessToken)}`,
      );
      let insightsData: { data?: Array<{ name: string; values: Array<{ value: number }> }> } = {};
      try {
        insightsData = (await checkResponse(insightsRes)) as typeof insightsData;
      } catch {
        // Insights pueden no estar disponibles para todos los tipos de post
      }

      const getMetric = (name: string) => {
        const item = insightsData.data?.find((d) => d.name === name);
        return item?.values?.[0]?.value;
      };

      return {
        likes: postData.like_count,
        comments: postData.comments_count,
        impressions: getMetric("impressions"),
        reach: getMetric("reach"),
        saves: getMetric("saved"),
        views: getMetric("video_views"),
        raw: { post: postData, insights: insightsData },
      };
    }

    if (account.platform === "facebook") {
      const res = await fetch(
        `${GRAPH}/${postId}?fields=reactions.summary(true),comments.summary(true),shares&access_token=${encodeURIComponent(accessToken)}`,
      );
      const data = (await checkResponse(res)) as {
        reactions?: { summary?: { total_count?: number } };
        comments?: { summary?: { total_count?: number } };
        shares?: { count?: number };
      };

      return {
        likes: data.reactions?.summary?.total_count,
        comments: data.comments?.summary?.total_count,
        shares: data.shares?.count,
        raw: data,
      };
    }

    throw new Error(`Meta adapter no soporta fetchMetrics para "${account.platform}"`);
  },
};
